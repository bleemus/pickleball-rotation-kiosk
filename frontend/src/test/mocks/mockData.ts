import { Session, Player, Round, Match, GameHistory } from '../../types/game';

export const mockPlayers: Player[] = [
  {
    id: 'player-1',
    name: 'Alice',
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    pointDifferential: 0,
    roundsSatOut: 0,
    consecutiveRoundsSatOut: 0,
    forceSitOut: false,
  },
  {
    id: 'player-2',
    name: 'Bob',
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    pointDifferential: 0,
    roundsSatOut: 0,
    consecutiveRoundsSatOut: 0,
    forceSitOut: false,
  },
  {
    id: 'player-3',
    name: 'Charlie',
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    pointDifferential: 0,
    roundsSatOut: 0,
    consecutiveRoundsSatOut: 0,
    forceSitOut: false,
  },
  {
    id: 'player-4',
    name: 'Dave',
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    pointDifferential: 0,
    roundsSatOut: 0,
    consecutiveRoundsSatOut: 0,
    forceSitOut: false,
  },
  {
    id: 'player-5',
    name: 'Eve',
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    pointDifferential: 0,
    roundsSatOut: 0,
    consecutiveRoundsSatOut: 0,
    forceSitOut: false,
  },
  {
    id: 'player-6',
    name: 'Frank',
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    pointDifferential: 0,
    roundsSatOut: 0,
    consecutiveRoundsSatOut: 0,
    forceSitOut: false,
  },
  {
    id: 'player-7',
    name: 'Grace',
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    pointDifferential: 0,
    roundsSatOut: 0,
    consecutiveRoundsSatOut: 0,
    forceSitOut: false,
  },
  {
    id: 'player-8',
    name: 'Heidi',
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    pointDifferential: 0,
    roundsSatOut: 0,
    consecutiveRoundsSatOut: 0,
    forceSitOut: false,
  },
];

export const mockMatch: Match = {
  id: 'match-1',
  courtNumber: 1,
  team1: {
    player1: mockPlayers[0],
    player2: mockPlayers[1],
  },
  team2: {
    player1: mockPlayers[2],
    player2: mockPlayers[3],
  },
  completed: false,
};

export const mockMatch2: Match = {
  id: 'match-2',
  courtNumber: 2,
  team1: {
    player1: mockPlayers[4],
    player2: mockPlayers[5],
  },
  team2: {
    player1: mockPlayers[6],
    player2: mockPlayers[7],
  },
  completed: false,
};

export const mockRound: Round = {
  roundNumber: 1,
  matches: [mockMatch, mockMatch2],
  benchedPlayers: [],
  completed: false,
};

export const mockCompletedMatch: Match = {
  ...mockMatch,
  team1Score: 11,
  team2Score: 9,
  completed: true,
};

export const mockCompletedRound: Round = {
  ...mockRound,
  matches: [mockCompletedMatch],
  completed: true,
};

export const mockGameHistory: GameHistory[] = [
  {
    matchId: 'match-1',
    roundNumber: 1,
    courtNumber: 1,
    team1Players: ['Alice', 'Bob'],
    team2Players: ['Charlie', 'Dave'],
    team1Score: 11,
    team2Score: 9,
    timestamp: Date.now() - 10000,
  },
];

export const mockSession: Session = {
  id: 'session-123',
  players: mockPlayers,
  currentRound: null,
  gameHistory: [],
  partnershipHistory: {},
  opponentHistory: {},
  numCourts: 2,
  createdAt: Date.now(),
  ended: false,
};

export const mockSessionWithRound: Session = {
  ...mockSession,
  currentRound: mockRound,
};

export const mockSessionWithCompletedRound: Session = {
  ...mockSession,
  currentRound: mockCompletedRound,
  gameHistory: mockGameHistory,
};

export const mockEndedSession: Session = {
  ...mockSession,
  ended: true,
  gameHistory: mockGameHistory,
};
