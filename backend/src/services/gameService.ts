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
import { saveSession, getSession, deleteSession, getActiveSessionId, setActiveSession, updateSessionAtomic } from "./redis";
import { generateNextRound, updateHistory, reverseHistory } from "./roundRobinService";

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
  // Trim whitespace
  const trimmedName = name.trim();

  // Validate name
  if (!trimmedName) {
    throw new Error("Player name cannot be empty");
  }

  if (trimmedName.length > 30) {
    throw new Error("Player name must be 30 characters or less");
  }

  // Check for invalid characters that could cause issues
  if (/[<>\"']/.test(trimmedName)) {
    throw new Error("Player name contains invalid characters");
  }

  return {
    id: uuidv4(),
    name: trimmedName,
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    pointDifferential: 0,
    roundsSatOut: 0,
    consecutiveRoundsSatOut: 0,
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

  // Set this as the active session (single-kiosk mode)
  await setActiveSession(session.id);

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
 * Retrieves the currently active session
 */
export async function getActiveSession(): Promise<Session | null> {
  const activeSessionId = await getActiveSessionId();
  if (!activeSessionId) {
    return null;
  }
  return await getSession(activeSessionId);
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

  // Check if removing this player would drop below minimum required
  const minPlayers = session.numCourts * 4;
  if (session.players.length <= minPlayers) {
    throw new Error(
      `Cannot remove player. Minimum ${minPlayers} players required for ${session.numCourts} court${session.numCourts > 1 ? "s" : ""}`,
    );
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

  // Update roundsSatOut and consecutiveRoundsSatOut for all players
  for (const player of session.players) {
    const isBenched = benchedPlayers.some((bp) => bp.id === player.id);
    if (isBenched) {
      player.roundsSatOut += 1;
      player.consecutiveRoundsSatOut += 1;
    } else {
      // Player is playing this round - reset consecutive counter
      player.consecutiveRoundsSatOut = 0;
    }
    // Note: forceSitOut flag is cleared when round is COMPLETED, not when started
    // This preserves the flag if round is canceled
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

  // Reverse the roundsSatOut and consecutiveRoundsSatOut increments for benched players
  for (const benchedPlayer of session.currentRound.benchedPlayers) {
    const player = session.players.find((p) => p.id === benchedPlayer.id);
    if (player) {
      if (player.roundsSatOut > 0) {
        player.roundsSatOut -= 1;
      }
      if (player.consecutiveRoundsSatOut > 0) {
        player.consecutiveRoundsSatOut -= 1;
      }
    }
  }

  // Clear the current round
  session.currentRound = null;

  await saveSession(session);
  return session;
}

/**
 * Completes the current round with scores
 * Uses atomic updates to prevent concurrent modification conflicts
 */
export async function completeCurrentRound(
  sessionId: string,
  request: CompleteRoundRequest,
): Promise<Session> {
  // Use atomic update to prevent race conditions when multiple users submit scores simultaneously
  return await updateSessionAtomic(sessionId, (session) => {

  if (!session.currentRound) {
    throw new Error("No active round to complete");
  }

  // Validate that at least some scores are being submitted
  if (!request.scores || request.scores.length === 0) {
    throw new Error("No scores provided. At least one match score must be submitted.");
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
        if (player) {
          player.gamesPlayed = Math.max(0, player.gamesPlayed - 1);
          if (team1Won) {
            player.wins = Math.max(0, player.wins - 1);
          } else {
            player.losses = Math.max(0, player.losses - 1);
          }
          player.pointDifferential -= pointDiff;
        }
      }

      for (const playerName of entry.team2Players) {
        const player = session.players.find((p) => p.name === playerName);
        if (player) {
          player.gamesPlayed = Math.max(0, player.gamesPlayed - 1);
          if (!team1Won) {
            player.wins = Math.max(0, player.wins - 1);
          } else {
            player.losses = Math.max(0, player.losses - 1);
          }
          player.pointDifferential += pointDiff;
        }
      }
    }

    // Reverse partnership and opponent history
    const { partnershipHistory, opponentHistory } = reverseHistory(
      session.currentRound.matches,
      session.partnershipHistory,
      session.opponentHistory,
    );
    session.partnershipHistory = partnershipHistory;
    session.opponentHistory = opponentHistory;

    // Remove old history entries
    session.gameHistory = session.gameHistory.filter(
      (h) => h.roundNumber !== session.currentRound!.roundNumber,
    );

    // Mark round as incomplete so we can reprocess it
    session.currentRound.completed = false;
  }

  // Validate that scores are being submitted
  for (const scoreInput of request.scores) {
    const match = session.currentRound.matches.find(
      (m) => m.id === scoreInput.matchId,
    );

    if (!match) {
      throw new Error(`Match ${scoreInput.matchId} not found in current round`);
    }

    // Validate that scores are not tied
    if (scoreInput.team1Score === scoreInput.team2Score) {
      throw new Error("Tie scores are not allowed. One team must win.");
    }

    // Validate that scores are non-negative
    if (scoreInput.team1Score < 0 || scoreInput.team2Score < 0) {
      throw new Error("Scores cannot be negative");
    }

    // Only process if this match wasn't already completed or scores changed
    const scoresChanged = match.team1Score !== scoreInput.team1Score || 
                          match.team2Score !== scoreInput.team2Score;

    if (match.completed && !scoresChanged) {
      // Skip already completed matches with same scores
      continue;
    }

    // If match was previously completed with different scores, reverse the stats
    if (match.completed && scoresChanged) {
      const oldTeam1Won = match.team1Score! > match.team2Score!;
      const oldPointDiff = match.team1Score! - match.team2Score!;

      const team1PlayerIds = [match.team1.player1.id, match.team1.player2.id];
      const team2PlayerIds = [match.team2.player1.id, match.team2.player2.id];

      for (const playerId of team1PlayerIds) {
        const player = session.players.find((p) => p.id === playerId);
        if (player) {
          player.gamesPlayed -= 1;
          if (oldTeam1Won) {
            player.wins -= 1;
          } else {
            player.losses -= 1;
          }
          player.pointDifferential -= oldPointDiff;
        }
      }

      for (const playerId of team2PlayerIds) {
        const player = session.players.find((p) => p.id === playerId);
        if (player) {
          player.gamesPlayed -= 1;
          if (!oldTeam1Won) {
            player.wins -= 1;
          } else {
            player.losses -= 1;
          }
          player.pointDifferential += oldPointDiff;
        }
      }

      // Remove old history entry
      session.gameHistory = session.gameHistory.filter(
        (h) => h.matchId !== match.id,
      );
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

  // Update partnership and opponent history only for completed matches
  const completedMatches = session.currentRound.matches.filter(m => m.completed);
  if (completedMatches.length > 0) {
    const { partnershipHistory, opponentHistory } = updateHistory(
      completedMatches,
      session.partnershipHistory,
      session.opponentHistory,
    );

    session.partnershipHistory = partnershipHistory;
    session.opponentHistory = opponentHistory;
  }

  // Only mark round as completed if ALL matches have scores
  const allMatchesCompleted = session.currentRound.matches.every(m => m.completed);
  session.currentRound.completed = allMatchesCompleted;

  // Clear forceSitOut flags only when round is fully completed
  if (allMatchesCompleted) {
    for (const player of session.players) {
      player.forceSitOut = false;
    }
  }

  // Return modified session (will be saved atomically by updateSessionAtomic)
  return session;
  });
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

/**
 * Ends a session and marks it as complete
 */
export async function endSession(sessionId: string): Promise<Session> {
  const session = await getSessionById(sessionId);
  
  // Can't end if there's an active round in progress
  if (session.currentRound && !session.currentRound.completed) {
    throw new Error("Cannot end session while a round is in progress. Please complete or cancel the current round first.");
  }
  
  session.ended = true;
  await saveSession(session);
  return session;
}
