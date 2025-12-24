import {
  Player,
  Match,
  PartnershipHistory,
  OpponentHistory,
  MatchupScore,
  Team,
} from "../types/game";
import { v4 as uuidv4 } from "uuid";

const PARTNERSHIP_PENALTY = 10;
const OPPONENT_PENALTY = 5;
const BENCH_BONUS = -20; // Negative because lower scores are better
const GAMES_PLAYED_PENALTY = 8; // Penalty for each game played (encourages less-played players, ensures new players get priority)
const CONSECUTIVE_BENCH_BONUS = -100; // Strong bonus (negative) to prioritize players who sat out last round

/**
 * Creates a unique key for a player pair (sorted alphabetically)
 */
function createPairKey(player1Id: string, player2Id: string): string {
  return [player1Id, player2Id].sort().join("-");
}

/**
 * Gets the number of times two players have partnered together
 */
function getPartnershipCount(
  player1Id: string,
  player2Id: string,
  partnershipHistory: PartnershipHistory
): number {
  const key = createPairKey(player1Id, player2Id);
  return partnershipHistory[key] || 0;
}

/**
 * Gets the number of times two players have opposed each other
 */
function getOpponentCount(
  player1Id: string,
  player2Id: string,
  opponentHistory: OpponentHistory
): number {
  const key = createPairKey(player1Id, player2Id);
  return opponentHistory[key] || 0;
}

/**
 * Calculates the score for a potential matchup (4 players)
 * Lower scores are better
 */
function calculateMatchupScore(
  players: Player[],
  partnershipHistory: PartnershipHistory,
  opponentHistory: OpponentHistory
): MatchupScore {
  if (players.length !== 4) {
    throw new Error("Matchup must have exactly 4 players");
  }

  // Try both possible team arrangements
  // Arrangement 1: [0,1] vs [2,3]
  // Arrangement 2: [0,2] vs [1,3]
  // Arrangement 3: [0,3] vs [1,2]

  const arrangements = [
    {
      partnerships: [
        [0, 1],
        [2, 3],
      ],
    },
    {
      partnerships: [
        [0, 2],
        [1, 3],
      ],
    },
    {
      partnerships: [
        [0, 3],
        [1, 2],
      ],
    },
  ];

  let bestScore = Infinity;
  let bestPartnerships: string[][] = [];

  for (const arrangement of arrangements) {
    let score = 0;

    // Calculate partnership penalties
    for (const [i, j] of arrangement.partnerships) {
      const partnerCount = getPartnershipCount(players[i].id, players[j].id, partnershipHistory);
      score += partnerCount * PARTNERSHIP_PENALTY;
    }

    // Calculate opponent penalties
    const team1 = arrangement.partnerships[0];
    const team2 = arrangement.partnerships[1];

    for (const i of team1) {
      for (const j of team2) {
        const opponentCount = getOpponentCount(players[i].id, players[j].id, opponentHistory);
        score += opponentCount * OPPONENT_PENALTY;
      }
    }

    // Add bench priority bonus (players who sat out get priority)
    for (const player of players) {
      score += player.roundsSatOut * BENCH_BONUS;
      // Add penalty for games played (to prioritize players with fewer games)
      score += player.gamesPlayed * GAMES_PLAYED_PENALTY;
      // Add strong bonus if player sat out last round (prioritize them to prevent consecutive benching)
      if (player.consecutiveRoundsSatOut > 0) {
        score += CONSECUTIVE_BENCH_BONUS;
      }
    }

    if (score < bestScore) {
      bestScore = score;
      bestPartnerships = arrangement.partnerships.map(([i, j]) => [players[i].id, players[j].id]);
    }
  }

  return {
    players: players.map((p) => p.id),
    score: bestScore,
    partnerships: bestPartnerships,
  };
}

/**
 * Generates all possible combinations of 4 players from a list
 */
function generateCombinations(players: Player[], size: number): Player[][] {
  const combinations: Player[][] = [];

  function helper(start: number, current: Player[]) {
    if (current.length === size) {
      combinations.push([...current]);
      return;
    }

    for (let i = start; i < players.length; i++) {
      current.push(players[i]);
      helper(i + 1, current);
      current.pop();
    }
  }

  helper(0, []);
  return combinations;
}

/**
 * Generates the best matchups for the next round
 * Returns matches based on number of courts and benched players
 */
export function generateNextRound(
  players: Player[],
  partnershipHistory: PartnershipHistory,
  opponentHistory: OpponentHistory,
  numCourts: number = 2
): { matches: Match[]; benchedPlayers: Player[] } {
  const minPlayers = numCourts * 4;
  if (players.length < minPlayers) {
    throw new Error(
      `Need at least ${minPlayers} players to generate a round with ${numCourts} court${numCourts > 1 ? "s" : ""}`
    );
  }

  // Separate players who are forced to sit out
  const forcedSitOutPlayers = players.filter((p) => p.forceSitOut === true);
  const availablePlayers = players.filter((p) => p.forceSitOut !== true);

  // Check if we have enough available players
  if (availablePlayers.length < minPlayers) {
    throw new Error(
      `Not enough players available. ${forcedSitOutPlayers.length} player(s) marked to sit out, need at least ${minPlayers} available players.`
    );
  }

  // Generate all possible 4-player combinations from available players only
  const allCombinations = generateCombinations(availablePlayers, 4);

  // Calculate scores for each combination
  const scoredMatchups = allCombinations.map((combo) =>
    calculateMatchupScore(combo, partnershipHistory, opponentHistory)
  );

  // Sort by score (lower is better)
  scoredMatchups.sort((a, b) => a.score - b.score);

  // Select the best non-overlapping matchups
  const selectedMatchups: MatchupScore[] = [];
  const usedPlayerIds = new Set<string>();

  for (const matchup of scoredMatchups) {
    // Check if any player in this matchup is already used
    const hasOverlap = matchup.players.some((playerId) => usedPlayerIds.has(playerId));

    if (!hasOverlap) {
      selectedMatchups.push(matchup);
      matchup.players.forEach((playerId) => usedPlayerIds.add(playerId));

      // Stop if we have enough matches for all courts
      if (selectedMatchups.length === numCourts) {
        break;
      }
    }
  }

  // Create Match objects
  const matches: Match[] = selectedMatchups.map((matchup, index) => {
    const playerMap = new Map(availablePlayers.map((p) => [p.id, p]));

    const team1Player1 = playerMap.get(matchup.partnerships[0][0])!;
    const team1Player2 = playerMap.get(matchup.partnerships[0][1])!;
    const team2Player1 = playerMap.get(matchup.partnerships[1][0])!;
    const team2Player2 = playerMap.get(matchup.partnerships[1][1])!;

    // Randomly assign which team serves (1 or 2)
    const servingTeam = Math.random() < 0.5 ? 1 : 2;

    return {
      id: uuidv4(),
      courtNumber: index + 1,
      team1: {
        player1: team1Player1,
        player2: team1Player2,
      },
      team2: {
        player1: team2Player1,
        player2: team2Player2,
      },
      completed: false,
      servingTeam: servingTeam as 1 | 2,
    };
  });

  // Determine benched players (includes forced sit-outs and natural benches)
  const benchedPlayers = [
    ...forcedSitOutPlayers,
    ...availablePlayers.filter((player) => !usedPlayerIds.has(player.id)),
  ];

  return { matches, benchedPlayers };
}

/**
 * Updates partnership and opponent history based on completed matches
 */
export function updateHistory(
  matches: Match[],
  partnershipHistory: PartnershipHistory,
  opponentHistory: OpponentHistory
): {
  partnershipHistory: PartnershipHistory;
  opponentHistory: OpponentHistory;
} {
  const newPartnershipHistory = { ...partnershipHistory };
  const newOpponentHistory = { ...opponentHistory };

  for (const match of matches) {
    // Update partnerships
    const team1Partners = [match.team1.player1.id, match.team1.player2.id];
    const team2Partners = [match.team2.player1.id, match.team2.player2.id];

    const team1Key = createPairKey(team1Partners[0], team1Partners[1]);
    const team2Key = createPairKey(team2Partners[0], team2Partners[1]);

    newPartnershipHistory[team1Key] = (newPartnershipHistory[team1Key] || 0) + 1;
    newPartnershipHistory[team2Key] = (newPartnershipHistory[team2Key] || 0) + 1;

    // Update opponents
    const team1Players = [match.team1.player1.id, match.team1.player2.id];
    const team2Players = [match.team2.player1.id, match.team2.player2.id];

    for (const t1Player of team1Players) {
      for (const t2Player of team2Players) {
        const opponentKey = createPairKey(t1Player, t2Player);
        newOpponentHistory[opponentKey] = (newOpponentHistory[opponentKey] || 0) + 1;
      }
    }
  }

  return {
    partnershipHistory: newPartnershipHistory,
    opponentHistory: newOpponentHistory,
  };
}

/**
 * Reverses partnership and opponent history for matches (used when resubmitting scores)
 */
export function reverseHistory(
  matches: Match[],
  partnershipHistory: PartnershipHistory,
  opponentHistory: OpponentHistory
): {
  partnershipHistory: PartnershipHistory;
  opponentHistory: OpponentHistory;
} {
  const newPartnershipHistory = { ...partnershipHistory };
  const newOpponentHistory = { ...opponentHistory };

  for (const match of matches) {
    // Reverse partnerships
    const team1Partners = [match.team1.player1.id, match.team1.player2.id];
    const team2Partners = [match.team2.player1.id, match.team2.player2.id];

    const team1Key = createPairKey(team1Partners[0], team1Partners[1]);
    const team2Key = createPairKey(team2Partners[0], team2Partners[1]);

    if (newPartnershipHistory[team1Key] && newPartnershipHistory[team1Key] > 0) {
      newPartnershipHistory[team1Key] -= 1;
    }
    if (newPartnershipHistory[team2Key] && newPartnershipHistory[team2Key] > 0) {
      newPartnershipHistory[team2Key] -= 1;
    }

    // Reverse opponents
    const team1Players = [match.team1.player1.id, match.team1.player2.id];
    const team2Players = [match.team2.player1.id, match.team2.player2.id];

    for (const t1Player of team1Players) {
      for (const t2Player of team2Players) {
        const opponentKey = createPairKey(t1Player, t2Player);
        if (newOpponentHistory[opponentKey] && newOpponentHistory[opponentKey] > 0) {
          newOpponentHistory[opponentKey] -= 1;
        }
      }
    }
  }

  return {
    partnershipHistory: newPartnershipHistory,
    opponentHistory: newOpponentHistory,
  };
}
