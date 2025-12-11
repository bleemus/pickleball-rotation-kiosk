# Pickleball Kiosk

A kiosk application for managing round-robin pickleball games across 2 courts with intelligent player rotation and score tracking.

## Features

- **Smart Round-Robin Algorithm**: Maximizes partner and opponent variety with weighted scoring
- **Configurable Courts**: Support for 1 to unlimited courts (default: 2)
- **Bench Rotation**: Fair rotation for players waiting their turn with priority system
- **Score Tracking**: Complete game history with win/loss records and point differential
- **Player Management**: Add/remove players between rounds, manual sit-out control
- **Score Editing**: Edit previous round scores with automatic stat recalculation
- **Touch-Friendly UI**: Large buttons and text optimized for kiosk displays
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
- Node.js 20+
- Docker & Docker Compose
- (Optional) Raspberry Pi for kiosk deployment

### Raspberry Pi Deployment (Recommended)

See [RASPBERRY_PI.md](RASPBERRY_PI.md) for complete guide.

```bash
# Copy to your Pi
scp -r pickleball-kiosk pi@raspberrypi.local:~/

# SSH to Pi
ssh pi@raspberrypi.local
cd pickleball-kiosk

# Run setup
./raspberry-pi-setup.sh

# Deploy
docker-compose up -d
```

Access at `http://localhost` or `http://raspberrypi.local`

### Local Development

#### 1. Start Redis

```bash
docker run -d -p 6379:6379 redis:7-alpine
```

#### 2. Backend Setup

```bash
cd backend
npm install
npm run dev
```

The backend API will run on `http://localhost:3001`

#### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will run on `http://localhost:3000`

### Environment Variables

#### Backend
Create `backend/.env`:
```env
PORT=3001
REDIS_URL=redis://localhost:6379
NODE_ENV=development
```

#### Frontend
Create `frontend/.env`:
```env
VITE_API_URL=http://localhost:3001/api
VITE_DEBUG_MODE=false  # Set to 'true' to enable debug features
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

### Using Make Commands

```bash
# Start services
make up

# View logs
make logs

# Stop services
make down

# Restart
make restart

# Clean everything
make clean
```

### Build Images Manually

```bash
# Build backend
cd backend
docker build -t pickleball-kiosk-backend:latest .

# Build frontend
cd ../frontend
docker build -t pickleball-kiosk-frontend:latest .

# Or build both
docker-compose build
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
- Verify Redis is running: `docker-compose ps redis`
- Check REDIS_URL environment variable
- Ensure port 3001 is available

### Frontend can't connect to backend
- Verify backend is running and healthy: `curl http://localhost:3001/health`
- Check VITE_API_URL in frontend/.env
- Check browser console for CORS errors

### Docker build issues
```bash
# Clean and rebuild
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

### Session data lost
- Redis data is ephemeral by default
- For persistence, Redis saves to volume every 60 seconds
- Session TTL is 24 hours by default

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
docker-compose up -d
```

### Systemd Service (Auto-start on boot)

See [RASPBERRY_PI.md](RASPBERRY_PI.md#auto-start-on-boot) for systemd setup.

## Documentation

- [QUICKSTART.md](QUICKSTART.md) - Quick deployment guide
- [RASPBERRY_PI.md](RASPBERRY_PI.md) - Raspberry Pi setup and kiosk mode

## License

MIT

## Contributing

Contributions welcome! Please open an issue or submit a pull request.
