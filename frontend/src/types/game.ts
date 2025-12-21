export interface Player {
  id: string;
  name: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  pointDifferential: number;
  roundsSatOut: number;
  consecutiveRoundsSatOut: number;
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
  team1Players: string[];
  team2Players: string[];
  team1Score: number;
  team2Score: number;
  timestamp: number;
}

// Partnership and opponent history types
export interface PartnershipHistory {
  [playerPair: string]: number; // "player1-player2" -> count
}

export interface OpponentHistory {
  [playerPair: string]: number; // "player1-player2" -> count
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
  ended?: boolean;
}

export enum GameState {
  SETUP = "setup",
  PLAYING = "playing",
  SCORING = "scoring",
  HISTORY = "history",
}
