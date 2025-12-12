# Pickleball Kiosk

A kiosk application for managing round-robin pickleball games across 2 courts with intelligent player rotation and score tracking.

## Features

- **Smart Round-Robin Algorithm**: Maximizes partner and opponent variety with weighted scoring
- **Configurable Courts**: Support for 1 to unlimited courts (default: 2)
- **Bench Rotation**: Fair rotation for players waiting their turn with priority system
- **Score Tracking**: Complete game history with win/loss records and point differential
- **Player Management**: Add/remove players between rounds, manual sit-out control
- **Score Editing**: Edit previous round scores with automatic stat recalculation
- **Spectator Display**: Dedicated full-screen view with auto-scrolling stats and live match updates
- **Previous Round Results**: Shows completed match scores while waiting between rounds
- **Customizable Branding**: Configure app name via environment variable
- **Built-in Help**: Comprehensive help modal with instructions for all features
- **Touch-Friendly UI**: Large buttons and text optimized for kiosk displays
- **Mobile Optimized**: Numeric keyboards for score entry on tablets and phones
- **Real-time Updates**: Persistent session state across page refreshes
- **Round Cancellation**: Ability to cancel and restart the current round
- **Debug Mode**: Auto-fill players for testing (development only)
- **Player Name Validation**: 30-character limit with duplicate prevention

## Architecture

### Frontend
- React 18 + TypeScript
- Vite for fast development and optimized builds
- Tailwind CSS for responsive, touch-friendly UI
- Nginx for production serving

### Backend
- Node.js + Express + TypeScript
- RESTful API design
- Health check endpoints

### Data Layer
- Redis for session state and game history
- 24-hour session expiration

### Deployment
- Docker Compose for easy deployment
- Optimized for Raspberry Pi

## Quick Start

### Prerequisites
- Docker & Docker Compose
- (Optional) Node.js 20+ for local development without Docker
- (Optional) Raspberry Pi for kiosk deployment

### Docker Compose Deployment (Recommended)

```bash
# Clone the repository
git clone https://github.com/bleemus/pickleball-rotation-kiosk.git
cd pickleball-rotation-kiosk

# Start all services (Redis, backend, frontend)
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

Access at **http://localhost**

**Common Commands:**
```bash
docker compose up -d        # Start all services
docker compose down         # Stop all services
docker compose logs -f      # View logs
docker compose restart      # Restart all services
docker compose ps           # View running services
```

### Raspberry Pi Deployment

See [RASPBERRY_PI.md](RASPBERRY_PI.md) for complete guide.

```bash
# Copy to your Pi
scp -r pickleball-rotation-kiosk pi@raspberrypi.local:~/

# SSH to Pi
ssh pi@raspberrypi.local
cd pickleball-rotation-kiosk

# Run setup
./raspberry-pi-setup.sh

# Deploy
docker compose up -d
```

Access at `http://raspberrypi.local`

### Local Development (without Docker)

For active development with hot-reload, see [LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md).

**Quick setup:**
```bash
# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Start all services with Docker Compose
docker compose up -d redis  # Start only Redis

# In separate terminals:
cd backend && npm run dev    # Backend on :3001
cd frontend && npm run dev   # Frontend on :3000
```

### Environment Variables

Create environment files:

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
VITE_DEBUG_MODE=false  # Set to true to enable debug features
VITE_APP_NAME=Pickleball Kiosk  # Customize the app name shown throughout the UI
```

## Docker Compose Deployment

### Quick Start

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

## Using Make Commands (Optional)

Makefile provides shortcuts for common Docker Compose operations:

```bash
make up          # docker compose up -d
make down        # docker compose down
make logs        # docker compose logs -f
make restart     # docker compose restart
make build       # docker compose build
make clean       # docker compose down -v (removes volumes)
```

## API Documentation

### Session Management

#### Create Session
```http
POST /api/session
Content-Type: application/json

{
  "playerNames": ["Alice", "Bob", "Charlie", "Dave"]
}
```

#### Get Session
```http
GET /api/session/:id
```

#### Delete Session
```http
DELETE /api/session/:id
```

### Player Management

#### Add Player
```http
POST /api/session/:id/players
Content-Type: application/json

{
  "name": "Eve"
}
```

#### Remove Player
```http
DELETE /api/session/:id/players/:playerId
```

#### Get Players
```http
GET /api/session/:id/players
```

#### Toggle Player Sit Out
```http
PATCH /api/session/:id/sitout/:playerId
```

#### Update Number of Courts
```http
PATCH /api/session/:id/courts
Content-Type: application/json

{
  "numCourts": 3
}
```

### Session Management (Active Session)

#### Get Active Session
```http
GET /api/session/active
```

Returns the currently active session without requiring a session ID.

### Game Management

#### Start Next Round
```http
POST /api/session/:id/round
```

#### Get Current Round
```http
GET /api/session/:id/round/current
```

#### Complete Round with Scores
```http
POST /api/session/:id/round/complete
Content-Type: application/json

{
  "scores": [
    {
      "matchId": "match-uuid-1",
      "team1Score": 11,
      "team2Score": 9
    },
    {
      "matchId": "match-uuid-2",
      "team1Score": 8,
      "team2Score": 11
    }
  ]
}
```

#### Get Game History
```http
GET /api/session/:id/history
```

## Round-Robin Algorithm

The application uses a sophisticated algorithm to generate fair and varied matchups:

### Scoring System
- **Partnership Penalty**: +10 points for each previous partnership
- **Opponent Penalty**: +5 points for each previous opposition
- **Bench Bonus**: -20 points per round sitting out
- **Games Played Penalty**: +8 points per game played (prioritizes new/less-played players)

### Process
1. Filter out players marked to sit out (manual sit-out feature)
2. Generate all possible 4-player combinations from available players
3. For each combination, try different team arrangements
4. Calculate penalty score (lower is better)
5. Select top N non-overlapping matchups for the configured courts
6. Remaining players go to the bench
7. Forced sit-out flags automatically clear after round generation

### Benefits
- Players partner with different people each round
- Opponents vary to maximize competition variety
- Benched players get priority in next round
- New players added mid-session get higher priority
- Fair rotation ensures everyone plays regularly
- Manual control to bench specific players when needed

## User Guide

### Starting a Session
1. Configure number of courts (default: 2) using the sidebar selector
2. Enter player names (minimum 4 × number of courts required)
3. Player names limited to 30 characters
4. Click "Start Game" to begin
5. **Debug Mode**: If enabled, use "🔧 Fill" button to auto-generate test players

### During Play
1. View current matchups on the main screen (centered player names)
2. Players play their matches
3. Click "Enter Scores" when matches complete
4. Input scores for all courts (ties are prevented)
5. Submit to complete the round
6. Click "Back to Manage" to cancel the round if needed

### Between Rounds
1. View player statistics in the right sidebar (auto-scrolling)
2. Add new players using the "Add New Player" form
3. Remove players by clicking the ✕ button (requires confirmation)
4. Use "Sit" button to manually bench a player for the next round
5. Change number of courts using the "Change Courts" button (lower left)
6. Click "Edit Previous Scores" to modify the last completed round
7. Click "View History" to see all past games
8. Click "Start Next Round" to generate new matchups

### Spectator Display
1. Navigate to `/spectator` on any device to view the full-screen spectator display
2. Automatically shows the active session (no session ID required)
3. Displays current matchups during rounds
4. Shows previous round results while waiting between rounds
5. Auto-scrolls player statistics for easy viewing on large displays
6. Updates every 2 seconds automatically
7. Ideal for TVs or secondary displays at your venue

### Help System
1. Click the **?** button (bottom right) on any screen to open help
2. Comprehensive guide covers all features and workflows
3. Sections include: Getting Started, During Round, Score Entry, Managing Players, Spectator Display, and Tips

### Managing Players
- Add players mid-session - new players get priority in matchups
- Remove players who need to leave (requires confirmation)
- Players sitting out show as "(Sitting Out)" in orange
- Active vs. sitting player counts displayed
- Inline validation prevents starting rounds without enough players

### Score Editing
- Edit previous round scores if mistakes were made
- Previous scores pre-fill in the form
- Stats automatically recalculate when scores change
- Can only edit the most recently completed round

### Statistics Tracked
- Games played
- Wins and losses
- **Point differential** (total points scored - points against)
- Rounds sat out (cumulative, used as tiebreaker)

### Resetting
- Click "Reset" button (upper left on all screens)
- Confirmation required to prevent accidental resets
- Clears all session data and error messages

## Troubleshooting

### Backend won't start
```bash
# Check all services
docker compose ps

# Check Redis specifically
docker compose ps redis

# View logs
docker compose logs backend
docker compose logs redis
```

### Frontend can't connect to backend
```bash
# Verify backend is healthy
curl http://localhost:3001/health

# Check all services
docker compose ps

# View frontend logs
docker compose logs frontend
```

### Docker build issues
```bash
# Clean and rebuild
docker compose down -v
docker compose build --no-cache
docker compose up -d

# Or use make
make clean
make build
make up
```

### Session data lost
- Redis data persists in Docker volume `redis-data`
- Session TTL is 24 hours by default
- To clear all data: `docker compose down -v`

## Development

### Project Structure
```
pickleball-kiosk/
├── backend/               # Express API server
│   ├── src/
│   │   ├── routes/       # API endpoints
│   │   ├── services/     # Business logic
│   │   └── types/        # TypeScript types
│   └── Dockerfile
├── frontend/             # React application
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── hooks/        # Custom hooks
│   │   └── types/        # TypeScript types
│   └── Dockerfile
├── docker-compose.yml    # Docker Compose config
└── RASPBERRY_PI.md       # Pi deployment guide
```

### Adding Features
1. Backend: Add service logic in `backend/src/services/`
2. Frontend: Create components in `frontend/src/components/`
3. Update types in both frontend and backend
4. Add API endpoints in `backend/src/routes/`
5. Connect frontend to API in `frontend/src/hooks/useApi.ts`

### Testing
```bash
# Backend type checking
cd backend
npm run typecheck

# Frontend type checking
cd frontend
npm run typecheck

# Build test
npm run build
```

## Production Deployment

### Docker Compose (Recommended)

Already configured with:
- Health checks for all services
- Auto-restart policies
- Volume persistence for Redis
- Resource limits

```bash
# Start all services
docker compose up -d

# View status
docker compose ps

# View logs
docker compose logs -f
```

### Systemd Service (Auto-start on boot)

See [RASPBERRY_PI.md](RASPBERRY_PI.md#auto-start-on-boot) for systemd setup.

## Documentation

- [QUICKSTART.md](QUICKSTART.md) - Quick deployment guide
- [LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md) - Development guide
- [RASPBERRY_PI.md](RASPBERRY_PI.md) - Raspberry Pi setup and kiosk mode
- [CHANGELOG.md](CHANGELOG.md) - Feature changelog
- [SECURITY.md](SECURITY.md) - Security audit

## License

MIT

## Contributing

Contributions welcome! Please open an issue or submit a pull request.
