# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Git Workflow Preferences

**IMPORTANT: Do NOT commit changes automatically.**

- Always show the user what changes were made
- Let the user review changes before committing
- The user will manually commit when ready
- Exception: Only commit if the user explicitly asks you to commit

## Project Overview

A kiosk application for managing round-robin pickleball games across 2 courts with intelligent player rotation and score tracking. Built with React + TypeScript frontend, Express + TypeScript backend, and Redis for session state.

## Common Commands

### Development (Local)

```bash
# Start Redis first
docker run -d -p 6379:6379 redis:7-alpine

# Install dependencies
make install

# Run all development servers
make dev
# Backend:      http://localhost:3001
# Frontend:     http://localhost:3000
# Email Parser: http://localhost:3002

# Run all tests (type checking + unit + E2E)
make test
```

### Production (Docker)

```bash
# Build and start all services
make build
make up
# Access at http://localhost

# View logs
make logs

# Stop services
make down

# Clean restart
make clean
make build
make up
```

### Individual Component Commands

```bash
# Backend only
cd backend
npm run dev          # Development server with hot reload (tsx watch)
npm run build        # Compile TypeScript
npm run start        # Run compiled code
npm run typecheck    # Type check without building

# Frontend only
cd frontend
npm run dev          # Development server (Vite)
npm run build        # Production build
npm run preview      # Preview production build
npm run typecheck    # Type check without building
npm test             # Run unit tests (Vitest)
npm run test:watch   # Unit tests in watch mode

# Email Parser only
cd email-parser
npm run dev          # Development server with hot reload
npm run build        # Compile TypeScript
npm run start        # Run compiled code
npm run typecheck    # Type check without building

# E2E Tests
npx playwright test              # Run all 16 E2E tests
npx playwright test --ui         # Interactive mode
npx playwright test --headed     # With browser visible
```

## Testing

### Test Suite

- **E2E Tests**: 16 Playwright tests covering setup, gameplay, score validation, and session recovery
- **Unit Tests**: Vitest tests for components and hooks
- **Type Checking**: Full TypeScript safety across frontend and backend

### Running Tests

```bash
make test-all                    # Run all tests (type check + unit + E2E)
make test                        # Type checking only
make test-unit                   # Unit tests only (Vitest)
make test-e2e                    # E2E tests only (Playwright - auto-starts services)
npx playwright test --ui         # E2E tests with interactive UI
```

**Note**: E2E tests automatically start backend and frontend dev servers. Redis must be running first (handled by `make test-e2e`).

## Architecture

### Services Overview

The application consists of four services:

1. **Frontend** (React + TypeScript + Vite) - Port 3000 (dev) / Port 80 (prod)
2. **Backend** (Express + TypeScript) - Port 3001
3. **Email Parser** (Express + TypeScript + Microsoft Graph API) - Port 3002
4. **Redis** (Data persistence) - Port 6379

### Data Flow

1. **Session Creation**: Frontend calls `/api/session` → Backend creates session in Redis with unique ID
2. **Round Generation**: Frontend calls `/api/session/:id/round` → Backend uses round-robin algorithm → Returns matches + benched players
3. **Score Submission**: Frontend submits scores → Backend updates player stats, partnership/opponent history → Marks round complete
4. **State Persistence**: All session state stored in Redis with 24-hour TTL, session ID stored in localStorage
5. **Email Integration**: Email Parser service checks Microsoft Graph API for Pickle Planner emails → Parses reservations → Stores in Redis with 7-day TTL → Frontend polls for current reservations

### Round-Robin Algorithm (backend/src/services/roundRobinService.ts)

The core matching algorithm prioritizes variety and fairness:

**Penalty System**:

- Partnership penalty: +10 per previous partnership
- Opponent penalty: +5 per previous opposition
- Bench bonus: -20 per round sitting out (priority for benched players)

**Process**:

1. Generate all possible 4-player combinations
2. For each combination, try 3 team arrangements: [0,1] vs [2,3], [0,2] vs [1,3], [0,3] vs [1,2]
3. Calculate total penalty score (lower is better)
4. Select best 2 non-overlapping matchups for the 2 courts
5. Remaining players go to bench with incremented `roundsSatOut` counter

**Key Functions**:

- `generateNextRound()`: Main entry point, returns matches + benched players
- `calculateMatchupScore()`: Scores a 4-player matchup with best team arrangement
- `updateHistory()`: Updates partnership/opponent history after round completion

### State Management (Frontend)

**Game States** (frontend/src/hooks/useGameState.ts):

- `SETUP`: Initial player entry before first round
- `PLAYING`: Active matches displayed or between rounds
- `SCORING`: Score entry mode

**Session Persistence**:

- Session ID stored in localStorage
- On page load/refresh, attempts to restore session from backend
- If current round exists and incomplete → `PLAYING` state
- If players exist but no active round → `SETUP` state

### API Structure

All routes in `backend/src/routes/game.ts`:

**Session Management**:

- `POST /api/session` - Create session with initial players
- `GET /api/session/:id` - Retrieve session
- `DELETE /api/session/:id` - Delete session

**Player Management**:

- `POST /api/session/:id/players` - Add player
- `DELETE /api/session/:id/players/:playerId` - Remove player (not during active round)
- `GET /api/session/:id/players` - Get all players

**Round Management**:

- `POST /api/session/:id/round` - Generate and start next round
- `GET /api/session/:id/round/current` - Get current round
- `POST /api/session/:id/round/complete` - Submit scores and complete round
- `GET /api/session/:id/history` - Get game history

### Type System

Types are duplicated between frontend and backend (must be kept in sync):

- `backend/src/types/game.ts`
- `frontend/src/types/game.ts`

**Core Types**:

- `Player`: Stats include id, name, gamesPlayed, wins, losses, roundsSatOut
- `Match`: Contains team1, team2, scores, courtNumber (1 or 2)
- `Round`: Contains matches array, benchedPlayers, roundNumber, completed flag
- `Session`: Contains players, currentRound, gameHistory, partnership/opponent history
- `PartnershipHistory`/`OpponentHistory`: Maps "playerId1-playerId2" → count

### Component Organization

**Main Components** (frontend/src/components/):

- `PlayerSetup.tsx`: Initial player entry screen
- `CurrentMatchups.tsx`: Displays active matches for both courts + bench
- `ScoreEntry.tsx`: Score input form for completed matches
- `BenchDisplay.tsx`: Shows benched players
- `ScoreHistory.tsx`: Full game history view
- `AdminControls.tsx`: Floating controls for history, reset, next round

**Hooks**:

- `useGameState.ts`: Local state management and localStorage persistence
- `useApi.ts`: API client wrapper around fetch

### Redis Schema

**Game Sessions** (backend/src/services/redis.ts):

- `session:{sessionId}` → JSON-serialized Session object
- TTL: 24 hours (86400 seconds)

**Email Reservations** (email-parser/src/services/reservationStorage.redis.ts):

- `reservation:{reservationId}` → JSON-serialized Reservation object
- `reservation:index` → Set of all reservation IDs (for fast enumeration)
- TTL: 7 days (604800 seconds)

**Connection**:

- URL from `REDIS_URL` environment variable (default: `redis://localhost:6379`)
- Graceful shutdown handlers for SIGTERM/SIGINT
- Shared Redis instance used by both backend and email-parser services

## Development Notes

### Adding a New Feature

1. **Define types** in both `backend/src/types/game.ts` and `frontend/src/types/game.ts`
2. **Backend service logic** in `backend/src/services/gameService.ts`
3. **API endpoint** in `backend/src/routes/game.ts`
4. **Frontend API call** in `frontend/src/hooks/useApi.ts`
5. **UI component** in `frontend/src/components/`
6. **Wire up in App.tsx**

### Modifying Round-Robin Algorithm

Edit penalty constants in `backend/src/services/roundRobinService.ts:11-13`:

```typescript
const PARTNERSHIP_PENALTY = 10; // Avoid repeated partnerships
const OPPONENT_PENALTY = 5; // Variety in opponents
const BENCH_BONUS = -20; // Priority for benched players
```

Higher penalties = stronger avoidance. Bench bonus is negative (lower score = better matchup).

### Testing Changes

```bash
# Type check both projects
make test

# Test backend API directly
curl http://localhost:3001/health
curl -X POST http://localhost:3001/api/session \
  -H "Content-Type: application/json" \
  -d '{"playerNames":["Alice","Bob","Charlie","Dave"]}'

# Test full stack with Docker
make build && make up
# Access at http://localhost
make down
```

### Common Gotchas

1. **Type sync**: Frontend and backend types must match exactly
2. **Player removal**: Cannot remove players in active rounds (backend/src/services/gameService.ts:100-114)
3. **Minimum players**: Sessions require minimum 4 players at all times
4. **Redis connection**: Backend won't start without Redis running
5. **Session ID**: Stored in localStorage as `sessionId`, cleared on reset
6. **Score completion**: All matches in round must have scores submitted before round is marked complete
7. **roundsSatOut counter**: Reset to 0 when player plays (backend/src/services/gameService.ts:214,227), incremented when benched (gameService.ts:149-153)

### Environment Variables

**Backend** (backend/.env):

```env
PORT=3001
REDIS_URL=redis://localhost:6379
NODE_ENV=development
EMAIL_PARSER_URL=http://localhost:3002

# WiFi credentials to display in QR code on spectator screen
# Both SSID and PASSWORD are required for WiFi QR code to appear
# WIFI_SSID=MyNetwork
# WIFI_PASSWORD=MyPassword123
```

**Frontend** (frontend/.env):

```env
VITE_API_URL=http://localhost:3001/api
```

**Email Parser** (email-parser/.env):

```env
# Microsoft Graph API Configuration
GRAPH_TENANT_ID=your-tenant-id
GRAPH_CLIENT_ID=your-client-id
GRAPH_CLIENT_SECRET=your-client-secret
GRAPH_USER_ID=your-email@example.com

# Check interval in minutes
EMAIL_CHECK_INTERVAL=1

# Feature flag to enable/disable email polling
# Set to "false" to disable email polling (useful if email service breaks)
# When disabled, service still runs but returns empty reservation lists
ENABLE_EMAIL_POLLING=true

# Service Configuration
PORT=3002

# Redis Configuration
REDIS_URL=redis://localhost:6379
```

For network access (other devices on LAN), use machine's IP in `VITE_API_URL`.

**WiFi Configuration**:

- `WIFI_SSID`: WiFi network name to display in QR code on spectator screen
- `WIFI_PASSWORD`: WiFi password (optional - if not set, QR code shows open network)
- Set in docker-compose.yml or .env file
- QR code will only appear if WIFI_SSID is configured
- Example: `WIFI_SSID=YourNetwork WIFI_PASSWORD=YourPassword make up`

**Email Parser Setup**:

See [email-parser/GRAPH_API_SETUP.md](email-parser/GRAPH_API_SETUP.md) for complete Microsoft Graph API configuration instructions.

**Email Polling Feature Flag**:

The email polling feature can be disabled if it stops working or causes issues:

- Set `ENABLE_EMAIL_POLLING=false` in `email-parser/.env` (local development)
- Set `ENABLE_EMAIL_POLLING=false` before `make up` (Docker deployment)
- Example: `ENABLE_EMAIL_POLLING=false make up`
- When disabled:
  - Email parser service still runs (no crashes)
  - No emails are checked/polled
  - API endpoints return empty arrays `[]`
  - Frontend continues to work without reservation data
- Check status: `curl http://localhost:3002/health` (look for `emailPollingEnabled: false`)

### Debugging

**Backend**:

- Console logs visible in terminal running `npm run dev`
- Use `console.log()` in service files
- Check Redis data: `docker exec -it <redis-container> redis-cli` → `KEYS *` → `GET session:<id>`

**Frontend**:

- Browser DevTools Console tab for errors
- React DevTools for component state inspection
- Network tab to monitor API calls

**Email Parser**:

- Console logs with ISO timestamps: `[2025-12-22T10:30:00.000Z] Checking for new emails...`
- View logs: `make email-logs` or `docker-compose logs -f email-parser`
- Health check: `curl http://localhost:3002/health`
- Manually trigger email check: `curl -X POST http://localhost:3002/api/check-emails`
- Check reservations: `curl http://localhost:3002/api/reservations`
- Check current reservations: `curl http://localhost:3002/api/reservations/current`
- View Redis data: `redis-cli SMEMBERS reservation:index` then `redis-cli GET reservation:<id>`

### Docker Deployment

The project uses multi-stage builds for optimized production images:

- **Backend**: Compiles TypeScript, runs with Node.js (port 3001)
- **Frontend**: Vite build, served by Nginx (port 80)
- **Email Parser**: Compiles TypeScript, runs with Node.js (port 3002)
- **Redis**: Standard redis:7-alpine image with volume persistence (port 6379)

Access in production:

- Frontend: http://localhost (port 80)
- Backend: http://localhost:3001
- Email Parser: http://localhost:3002
- Health checks:
  - Backend: http://localhost:3001/health
  - Email Parser: http://localhost:3002/health
