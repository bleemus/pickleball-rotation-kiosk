import { http, HttpResponse } from 'msw';
import {
  mockSession,
  mockSessionWithRound,
  mockSessionWithCompletedRound,
  mockPlayers,
  mockRound,
  mockGameHistory
} from './mockData';

const API_BASE_URL = '/api';

export const handlers = [
  // Session endpoints
  http.post(`${API_BASE_URL}/session`, async ({ request }) => {
    const body = await request.json() as { playerNames: string[]; numCourts?: number };
    return HttpResponse.json({
      ...mockSession,
      players: body.playerNames.map((name, index) => ({
        ...mockPlayers[index],
        name,
        id: `player-${index + 1}`,
      })),
      numCourts: body.numCourts || 2,
    });
  }),

  http.get(`${API_BASE_URL}/session/:id`, () => {
    return HttpResponse.json(mockSession);
  }),

  http.get(`${API_BASE_URL}/session/active`, () => {
    // Default: no active session
    return new HttpResponse(null, { status: 404 });
  }),

  http.delete(`${API_BASE_URL}/session/:id`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  http.patch(`${API_BASE_URL}/session/:id/courts`, async ({ request }) => {
    const body = await request.json() as { numCourts: number };
    return HttpResponse.json({
      ...mockSession,
      numCourts: body.numCourts,
    });
  }),

  // Player endpoints
  http.post(`${API_BASE_URL}/session/:id/players`, async ({ request }) => {
    const body = await request.json() as { name: string };
    const newPlayer = {
      id: `player-${mockSession.players.length + 1}`,
      name: body.name,
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      pointDifferential: 0,
      roundsSatOut: 0,
      consecutiveRoundsSatOut: 0,
      forceSitOut: false,
    };
    return HttpResponse.json({
      ...mockSession,
      players: [...mockSession.players, newPlayer],
    });
  }),

  http.delete(`${API_BASE_URL}/session/:sessionId/players/:playerId`, () => {
    return HttpResponse.json({
      ...mockSession,
      players: mockSession.players.slice(0, -1),
    });
  }),

  http.get(`${API_BASE_URL}/session/:id/players`, () => {
    return HttpResponse.json(mockPlayers);
  }),

  http.patch(`${API_BASE_URL}/session/:sessionId/players/:playerId/sitout`, () => {
    return HttpResponse.json(mockSession);
  }),

  // Round endpoints
  http.post(`${API_BASE_URL}/session/:id/round`, () => {
    return HttpResponse.json(mockSessionWithRound);
  }),

  http.delete(`${API_BASE_URL}/session/:id/round`, () => {
    return HttpResponse.json({
      ...mockSession,
      currentRound: null,
    });
  }),

  http.get(`${API_BASE_URL}/session/:id/round/current`, () => {
    return HttpResponse.json(mockRound);
  }),

  http.post(`${API_BASE_URL}/session/:id/round/complete`, async () => {
    return HttpResponse.json(mockSessionWithCompletedRound);
  }),

  // History endpoints
  http.get(`${API_BASE_URL}/session/:id/history`, () => {
    return HttpResponse.json(mockGameHistory);
  }),

  // End session
  http.post(`${API_BASE_URL}/session/:id/end`, () => {
    return HttpResponse.json({
      ...mockSession,
      ended: true,
    });
  }),
];
