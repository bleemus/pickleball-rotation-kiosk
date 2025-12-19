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
    courtNumber: 1 | 2;
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
    courtNumber: 1 | 2;
    team1Players: string[];
    team2Players: string[];
    team1Score: number;
    team2Score: number;
    timestamp: number;
}

export interface Session {
    id: string;
    players: Player[];
    currentRound: Round | null;
    gameHistory: GameHistory[];
    partnershipHistory: Record<string, number>;
    opponentHistory: Record<string, number>;
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
