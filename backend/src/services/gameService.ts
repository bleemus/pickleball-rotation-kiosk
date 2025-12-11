import { v4 as uuidv4 } from "uuid";
import {
  Session,
  Player,
  Round,
  GameHistory,
  CreateSessionRequest,
  AddPlayerRequest,
  CompleteRoundRequest,
} from "../types/game";
import { saveSession, getSession, deleteSession } from "./redis";
import { generateNextRound, updateHistory } from "./roundRobinService";

/**
 * Shuffles an array using Fisher-Yates algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Creates a new player object
 */
function createPlayer(name: string): Player {
  if (name.length > 30) {
    throw new Error("Player name must be 30 characters or less");
  }

  return {
    id: uuidv4(),
    name,
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    pointDifferential: 0,
    roundsSatOut: 0,
    forceSitOut: false,
  };
}

/**
 * Creates a new game session
 */
export async function createSession(
  request: CreateSessionRequest,
): Promise<Session> {
  const numCourts = request.numCourts || 2;
  const minPlayers = numCourts * 4;

  if (request.playerNames.length < minPlayers) {
    throw new Error(
      `Need at least ${minPlayers} players for ${numCourts} court${numCourts > 1 ? "s" : ""}`,
    );
  }

  const players = request.playerNames.map((name) => createPlayer(name));

  const session: Session = {
    id: uuidv4(),
    players,
    currentRound: null,
    gameHistory: [],
    partnershipHistory: {},
    opponentHistory: {},
    numCourts,
    createdAt: Date.now(),
  };

  await saveSession(session);
  return session;
}

/**
 * Retrieves a session by ID
 */
export async function getSessionById(sessionId: string): Promise<Session> {
  const session = await getSession(sessionId);
  if (!session) {
    throw new Error(`Session ${sessionId} not found`);
  }
  return session;
}

/**
 * Updates the number of courts in a session
 */
export async function updateNumCourts(
  sessionId: string,
  numCourts: number,
): Promise<Session> {
  const session = await getSessionById(sessionId);

  if (numCourts < 1) {
    throw new Error("Number of courts must be at least 1");
  }

  // Check if there's a round in progress
  if (session.currentRound && !session.currentRound.completed) {
    throw new Error(
      "Cannot change number of courts while a round is in progress",
    );
  }

  session.numCourts = numCourts;
  await saveSession(session);
  return session;
}

/**
 * Adds a new player to an existing session
 */
export async function addPlayer(
  sessionId: string,
  request: AddPlayerRequest,
): Promise<Session> {
  const session = await getSessionById(sessionId);

  // Check if player name already exists
  const existingPlayer = session.players.find(
    (p) => p.name.toLowerCase() === request.name.toLowerCase(),
  );

  if (existingPlayer) {
    throw new Error(`Player ${request.name} already exists in this session`);
  }

  const newPlayer = createPlayer(request.name);
  session.players.push(newPlayer);

  await saveSession(session);
  return session;
}

/**
 * Removes a player from a session
 */
export async function removePlayer(
  sessionId: string,
  playerId: string,
): Promise<Session> {
  const session = await getSessionById(sessionId);

  // Check if player is in current round
  if (session.currentRound && !session.currentRound.completed) {
    const isInCurrentRound = session.currentRound.matches.some(
      (match) =>
        match.team1.player1.id === playerId ||
        match.team1.player2.id === playerId ||
        match.team2.player1.id === playerId ||
        match.team2.player2.id === playerId,
    );

    if (isInCurrentRound) {
      throw new Error(
        "Cannot remove player who is in the current active round",
      );
    }
  }

  session.players = session.players.filter((p) => p.id !== playerId);

  await saveSession(session);
  return session;
}

/**
 * Toggles a player's forceSitOut flag for the next round
 */
export async function togglePlayerSitOut(
  sessionId: string,
  playerId: string,
): Promise<Session> {
  const session = await getSessionById(sessionId);

  const player = session.players.find((p) => p.id === playerId);
  if (!player) {
    throw new Error(`Player ${playerId} not found in session`);
  }

  // Toggle the forceSitOut flag
  player.forceSitOut = !player.forceSitOut;

  await saveSession(session);
  return session;
}

/**
 * Generates and starts the next round
 */
export async function startNextRound(sessionId: string): Promise<Session> {
  const session = await getSessionById(sessionId);

  // Check if current round is completed
  if (session.currentRound && !session.currentRound.completed) {
    throw new Error("Current round is not completed yet");
  }

  const roundNumber = session.currentRound
    ? session.currentRound.roundNumber + 1
    : 1;

  // For the first round, shuffle players randomly
  const playersToUse =
    roundNumber === 1 ? shuffleArray(session.players) : session.players;

  // Generate next round using round-robin algorithm
  const { matches, benchedPlayers } = generateNextRound(
    playersToUse,
    session.partnershipHistory,
    session.opponentHistory,
    session.numCourts,
  );

  // Update roundsSatOut for benched players
  for (const player of session.players) {
    const isBenched = benchedPlayers.some((bp) => bp.id === player.id);
    if (isBenched) {
      player.roundsSatOut += 1;
    }
    // Clear forceSitOut flag after round is generated
    player.forceSitOut = false;
  }

  session.currentRound = {
    roundNumber,
    matches,
    benchedPlayers,
    completed: false,
  };

  await saveSession(session);
  return session;
}

/**
 * Cancels the current round (if not completed)
 */
export async function cancelCurrentRound(sessionId: string): Promise<Session> {
  const session = await getSessionById(sessionId);

  if (!session.currentRound) {
    throw new Error("No active round to cancel");
  }

  if (session.currentRound.completed) {
    throw new Error("Cannot cancel a completed round");
  }

  // Reverse the roundsSatOut increments for benched players
  for (const benchedPlayer of session.currentRound.benchedPlayers) {
    const player = session.players.find((p) => p.id === benchedPlayer.id);
    if (player && player.roundsSatOut > 0) {
      player.roundsSatOut -= 1;
    }
  }

  // Clear the current round
  session.currentRound = null;

  await saveSession(session);
  return session;
}

/**
 * Completes the current round with scores
 */
export async function completeCurrentRound(
  sessionId: string,
  request: CompleteRoundRequest,
): Promise<Session> {
  const session = await getSessionById(sessionId);

  if (!session.currentRound) {
    throw new Error("No active round to complete");
  }

  const isResubmit = session.currentRound.completed;

  // If re-submitting scores, we need to reverse the previous stats
  if (isResubmit) {
    // Find and remove old history entries for this round
    const oldHistoryEntries = session.gameHistory.filter(
      (h) => h.roundNumber === session.currentRound!.roundNumber,
    );

    // Reverse player stats from old scores
    for (const entry of oldHistoryEntries) {
      const team1Won = entry.team1Score > entry.team2Score;
      const pointDiff = entry.team1Score - entry.team2Score;

      // Find players by name (since history stores names, not IDs)
      for (const playerName of entry.team1Players) {
        const player = session.players.find((p) => p.name === playerName);
        if (player && player.gamesPlayed > 0) {
          player.gamesPlayed -= 1;
          if (team1Won && player.wins > 0) {
            player.wins -= 1;
          } else if (!team1Won && player.losses > 0) {
            player.losses -= 1;
          }
          player.pointDifferential -= pointDiff;
        }
      }

      for (const playerName of entry.team2Players) {
        const player = session.players.find((p) => p.name === playerName);
        if (player && player.gamesPlayed > 0) {
          player.gamesPlayed -= 1;
          if (!team1Won && player.wins > 0) {
            player.wins -= 1;
          } else if (team1Won && player.losses > 0) {
            player.losses -= 1;
          }
          player.pointDifferential += pointDiff;
        }
      }
    }

    // Remove old history entries
    session.gameHistory = session.gameHistory.filter(
      (h) => h.roundNumber !== session.currentRound!.roundNumber,
    );

    // Mark round as incomplete so we can reprocess it
    session.currentRound.completed = false;
  }

  // Validate that all matches have scores
  for (const scoreInput of request.scores) {
    const match = session.currentRound.matches.find(
      (m) => m.id === scoreInput.matchId,
    );

    if (!match) {
      throw new Error(`Match ${scoreInput.matchId} not found in current round`);
    }

    // Update match with scores
    match.team1Score = scoreInput.team1Score;
    match.team2Score = scoreInput.team2Score;
    match.completed = true;

    // Update player stats
    const team1Won = scoreInput.team1Score > scoreInput.team2Score;
    const pointDiff = scoreInput.team1Score - scoreInput.team2Score;

    const team1PlayerIds = [match.team1.player1.id, match.team1.player2.id];
    const team2PlayerIds = [match.team2.player1.id, match.team2.player2.id];

    for (const playerId of team1PlayerIds) {
      const player = session.players.find((p) => p.id === playerId);
      if (player) {
        player.gamesPlayed += 1;
        if (team1Won) {
          player.wins += 1;
        } else {
          player.losses += 1;
        }
        player.pointDifferential += pointDiff;
      }
    }

    for (const playerId of team2PlayerIds) {
      const player = session.players.find((p) => p.id === playerId);
      if (player) {
        player.gamesPlayed += 1;
        if (!team1Won) {
          player.wins += 1;
        } else {
          player.losses += 1;
        }
        player.pointDifferential -= pointDiff;
      }
    }

    // Add to game history
    const historyEntry: GameHistory = {
      matchId: match.id,
      roundNumber: session.currentRound.roundNumber,
      courtNumber: match.courtNumber,
      team1Players: [match.team1.player1.name, match.team1.player2.name],
      team2Players: [match.team2.player1.name, match.team2.player2.name],
      team1Score: scoreInput.team1Score,
      team2Score: scoreInput.team2Score,
      timestamp: Date.now(),
    };

    session.gameHistory.push(historyEntry);
  }

  // Update partnership and opponent history
  const { partnershipHistory, opponentHistory } = updateHistory(
    session.currentRound.matches,
    session.partnershipHistory,
    session.opponentHistory,
  );

  session.partnershipHistory = partnershipHistory;
  session.opponentHistory = opponentHistory;
  session.currentRound.completed = true;

  await saveSession(session);
  return session;
}

/**
 * Gets the current round for a session
 */
export async function getCurrentRound(
  sessionId: string,
): Promise<Round | null> {
  const session = await getSessionById(sessionId);
  return session.currentRound;
}

/**
 * Gets the game history for a session
 */
export async function getGameHistory(
  sessionId: string,
): Promise<GameHistory[]> {
  const session = await getSessionById(sessionId);
  return session.gameHistory;
}

/**
 * Deletes a session
 */
export async function deleteSessionById(sessionId: string): Promise<void> {
  await deleteSession(sessionId);
}
