export interface Player {
  id: string;
  name: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  pointDifferential: number;
  roundsSatOut: number;
  forceSitOut?: boolean;
}

export interface Team {
  player1: Player;
  player2: Player;
}

export interface Match {
  id: string;
  courtNumber: number;
  team1: Team;
  team2: Team;
  team1Score?: number;
  team2Score?: number;
  completed: boolean;
}

export interface Round {
  roundNumber: number;
  matches: Match[];
  benchedPlayers: Player[];
  completed: boolean;
}

export interface GameHistory {
  matchId: string;
  roundNumber: number;
  courtNumber: number;
  team1Players: string[]; // player names
  team2Players: string[];
  team1Score: number;
  team2Score: number;
  timestamp: number;
}

export interface PartnershipHistory {
  [playerPair: string]: number; // "player1-player2" -> count
}

export interface OpponentHistory {
  [playerPair: string]: number; // "player1-player2" -> count (how many times they've opposed)
}

export interface Session {
  id: string;
  players: Player[];
  currentRound: Round | null;
  gameHistory: GameHistory[];
  partnershipHistory: PartnershipHistory;
  opponentHistory: OpponentHistory;
  numCourts: number;
  createdAt: number;
}

export interface CreateSessionRequest {
  playerNames: string[];
  numCourts?: number;
}

export interface AddPlayerRequest {
  name: string;
}

export interface CompleteRoundRequest {
  scores: {
    matchId: string;
    team1Score: number;
    team2Score: number;
  }[];
}

export interface MatchupScore {
  players: string[]; // 4 player IDs
  score: number; // lower is better
  partnerships: string[][]; // [[p1, p2], [p3, p4]]
}
