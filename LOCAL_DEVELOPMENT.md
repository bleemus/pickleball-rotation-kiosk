# Local Development Guide

Guide for developing and testing the Pickleball Kiosk on your local machine (Mac, Linux, or Windows).

## Quick Start

### 1. Install Prerequisites

- **Node.js 20+**: [Download](https://nodejs.org/)
- **Docker**: [Download](https://www.docker.com/products/docker-desktop/)

### 2. Clone and Setup

```bash
# Clone the repository
git clone https://github.com/bleemus/pickleball-rotation-kiosk.git
cd pickleball-rotation-kiosk

# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Or use make
make install
```

### 3. Start Development

**Option 1: Use Docker Compose (Recommended)**

```bash
# Start only Redis with Docker Compose
docker compose up -d redis

# Start backend (in terminal 1)
cd backend && npm run dev

# Start frontend (in terminal 2)
cd frontend && npm run dev
```

**Option 2: Full Docker Compose (for testing production build)**

```bash
# Start all services (Redis, backend, frontend)
docker compose up -d

# Access at http://localhost (port 80)
# Note: This runs production builds, not dev servers with hot-reload
```

### 4. Access the App

- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

## Development Workflow

### Hot Reload

Both servers support hot reload:

- **Frontend**: Edit React files → browser auto-refreshes
- **Backend**: Edit TypeScript files → server auto-restarts

### Type Checking

```bash
# Check all types
make test

# Or individually
cd backend && npm run typecheck
cd frontend && npm run typecheck
```

### Environment Variables

Create environment files for backend and frontend:

**Backend** (`backend/.env`):
```bash
cp backend/.env.example backend/.env
```

```env
PORT=3001
REDIS_URL=redis://localhost:6379
NODE_ENV=development
```

**Frontend** (`frontend/.env`):
```bash
cp frontend/.env.example frontend/.env
```

```env
VITE_API_URL=http://localhost:3001/api
VITE_DEBUG_MODE=true  # Set to false to disable debug features
```

### Debug Mode

Enable debug mode for faster testing:

1. Edit `frontend/.env` and set `VITE_DEBUG_MODE=true`
2. Restart the frontend dev server
3. A purple \"🔧 Fill\" button appears on the initial screen
4. Click it to auto-generate random player names up to the required amount
5. Useful for quickly testing multi-court scenarios

**Note**: Debug mode is for development only. Keep disabled in production.

## Testing Your Changes

### 1. Test Backend API

```bash
# Health check
curl http://localhost:3001/health

# Create a session with custom court count
curl -X POST http://localhost:3001/api/session \
  -H "Content-Type: application/json" \
  -d '{"playerNames":["Alice","Bob","Charlie","Dave","Eve","Frank","Grace","Henry"],"numCourts":2}'

# Get session (use ID from above)
curl http://localhost:3001/api/session/<session-id>

# Add a player
curl -X POST http://localhost:3001/api/session/<session-id>/players \
  -H "Content-Type: application/json" \
  -d '{"name":"Isaac"}'

# Toggle player sit out
curl -X PATCH http://localhost:3001/api/session/<session-id>/sitout/<player-id>

# Update number of courts
curl -X PATCH http://localhost:3001/api/session/<session-id>/courts \
  -H "Content-Type: application/json" \
  -d '{"numCourts":3}'

# Start a round
curl -X POST http://localhost:3001/api/session/<session-id>/round

# Cancel current round
curl -X DELETE http://localhost:3001/api/session/<session-id>/round

# Complete round with scores
curl -X POST http://localhost:3001/api/session/<session-id>/round/complete \
  -H "Content-Type: application/json" \
  -d '{"scores":[{"matchId":"<match-id>","team1Score":11,"team2Score":9}]}'
```

### 2. Test Frontend

1. Open http://localhost:3000
2. Configure number of courts (1-unlimited, default: 2)
3. Add 4+ players (30 character max per name)
   - Or use Debug Mode auto-fill if enabled
4. Start game
5. Check matchups display (centered player names)
6. Test player management between rounds:
   - Add/remove players (with confirmation)
   - Mark players to sit out
   - Change number of courts
7. Enter scores (ties prevented)
8. Edit previous scores to test stat recalculation
9. Start next round
10. Check statistics sidebar (auto-scrolling, point differential)

### 3. Test Full Stack with Docker

```bash
# Build and start all services
make build
make up

# Access at http://localhost
# Stop when done
make down
```

## Development Tips

### Debugging Backend

#### Console Logging
```typescript
// In any backend file
console.log('Debug info:', yourVariable);
```

#### VS Code Debugger

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Backend Dev",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "cwd": "${workspaceFolder}/backend",
      "console": "integratedTerminal"
    }
  ]
}
```

### Debugging Frontend

1. Open browser DevTools (F12)
2. **Console** tab: Check for errors
3. **Network** tab: Monitor API calls
4. **Components** tab (React DevTools): Inspect component state

Install React DevTools:
- [Chrome Extension](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi)
- [Firefox Extension](https://addons.mozilla.org/en-US/firefox/addon/react-devtools/)

### Managing Redis

```bash
# Connect to Redis CLI
docker exec -it pickleball-redis redis-cli

# View all keys
KEYS *

# Get a session
GET session:<session-id>

# Clear all data
FLUSHALL

# Exit
exit
```

## Common Development Tasks

### Add a New API Endpoint

1. Define types in `backend/src/types/game.ts`
2. Add service function in `backend/src/services/gameService.ts`
3. Add route in `backend/src/routes/game.ts`
4. Update frontend API in `frontend/src/hooks/useApi.ts`

### Add a New Component

1. Create component file in `frontend/src/components/`
2. Add types in `frontend/src/types/game.ts` (if needed)
3. Import and use in `App.tsx` or other components

Example:

```tsx
// frontend/src/components/NewFeature.tsx
import { Player } from '../types/game';

interface NewFeatureProps {
  players: Player[];
}

export function NewFeature({ players }: NewFeatureProps) {
  return (
    <div className="p-4">
      {/* Your component */}
    </div>
  );
}
```

### Modify the Round-Robin Algorithm

Edit `backend/src/services/roundRobinService.ts`:

```typescript
// Adjust penalty weights
const PARTNERSHIP_PENALTY = 10;     // Points added for previous partnerships
const OPPONENT_PENALTY = 5;         // Points added for previous opponents
const BENCH_BONUS = -20;            // Points subtracted for sitting out (priority boost)
const GAMES_PLAYED_PENALTY = 8;     // Points added per game played (prioritizes new players)
```

**Recent Changes:**
- Increased `GAMES_PLAYED_PENALTY` from 3 to 8 to better prioritize new/less-played players
- Manual sit-out feature filters players before matchup generation
- Weighted scoring ensures fair rotation and variety

## Troubleshooting

### Backend won't start

```bash
# Check if Redis is running
docker ps | grep redis

# Check if port 3001 is in use
lsof -i :3001  # Mac/Linux
netstat -ano | findstr :3001  # Windows

# Restart backend
cd backend
npm run dev
```

### Frontend won't start

```bash
# Check if port 3000 is in use
lsof -i :3000  # Mac/Linux
netstat -ano | findstr :3000  # Windows

# Clear Vite cache
cd frontend
rm -rf node_modules/.vite
npm run dev
```

### CORS errors

Make sure backend CORS is enabled (already configured in `backend/src/server.ts`):

```typescript
app.use(cors());
```

### Redis connection issues

```bash
# Check Redis is running
docker ps

# Start Redis if not running
docker run -d -p 6379:6379 --name pickleball-redis redis:7-alpine

# Check connectivity
docker exec pickleball-redis redis-cli ping
# Should return: PONG
```

### Type errors

```bash
# Check types
make test

# Fix common issues:
# 1. Make sure types match between frontend and backend
# 2. Run npm install if types are missing
# 3. Restart VS Code TypeScript server
```

### npm install fails

```bash
# Clear cache
npm cache clean --force

# Delete node_modules and reinstall
cd backend
rm -rf node_modules package-lock.json
npm install

cd ../frontend
rm -rf node_modules package-lock.json
npm install
```

## Project Structure

```
pickleball-kiosk/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   └── game.ts           # API endpoints
│   │   ├── services/
│   │   │   ├── gameService.ts    # Business logic
│   │   │   ├── redis.ts          # Redis client
│   │   │   └── roundRobinService.ts  # Matching algorithm
│   │   ├── types/
│   │   │   └── game.ts           # TypeScript types
│   │   └── server.ts             # Express server
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AdminControls.tsx
│   │   │   ├── BenchDisplay.tsx
│   │   │   ├── CurrentMatchups.tsx
│   │   │   ├── PlayerSetup.tsx
│   │   │   ├── ScoreEntry.tsx
│   │   │   └── ScoreHistory.tsx
│   │   ├── hooks/
│   │   │   ├── useApi.ts         # API client
│   │   │   └── useGameState.ts   # State management
│   │   ├── types/
│   │   │   └── game.ts           # TypeScript types
│   │   ├── App.tsx               # Main app
│   │   └── main.tsx              # Entry point
│   ├── package.json
│   └── vite.config.ts
└── docker-compose.yml
```

## Making Changes

### 1. Create a Branch

```bash
git checkout -b feature/my-new-feature
```

### 2. Make Your Changes

Edit files, test locally, check types:

```bash
make test
```

### 3. Test with Docker

```bash
make build
make up
# Test at http://localhost
make down
```

### 4. Commit

```bash
git add .
git commit -m "Add new feature: description"
```

### 5. Push

```bash
git push origin feature/my-new-feature
```

## Performance Tips

### Backend Performance

- Use Redis connection pooling (already configured)
- Cache expensive calculations
- Add database indexes if using persistent storage

### Frontend Performance

- Use React.memo for expensive components
- Lazy load routes if app grows
- Optimize images and assets

### Development Server Performance

- Vite is already fast
- For faster backend restarts, use `tsx` (already configured)

## Useful Commands

```bash
# Development
make install      # Install dependencies
make dev          # Start dev servers
make test         # Type checking

# Docker
make build        # Build images
make up           # Start services
make down         # Stop services
make logs         # View logs
make restart      # Restart all
make clean        # Remove everything

# Git
git status        # Check status
git diff          # View changes
git log           # View history
```

## Editor Setup

### VS Code (Recommended)

Install extensions:
- ESLint
- Prettier
- TypeScript and JavaScript Language Features
- Tailwind CSS IntelliSense
- Docker

### Settings

Create `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.preferences.importModuleSpecifier": "relative"
}
```

## Next Steps

- See [README.md](README.md) for API documentation
- See [RASPBERRY_PI.md](RASPBERRY_PI.md) for deployment
- See [QUICKSTART.md](QUICKSTART.md) for quick commands

## Getting Help

- Check the [README.md](README.md) for general documentation
- Check browser console for frontend errors
- Check terminal output for backend errors
- Use `docker-compose logs` for container issues
