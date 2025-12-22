# Pickleball Kiosk

A kiosk application for managing round-robin pickleball games across 2 courts with intelligent player rotation and score tracking.

## Features

- **Smart Round-Robin Algorithm**: Maximizes partner and opponent variety with weighted scoring
- **Configurable Courts**: Support for 1 to unlimited courts (default: 2)
- **Bench Rotation**: Fair rotation for players waiting their turn with priority system
- **Score Tracking**: Complete game history with win/loss records and point differential
- **Player Management**: Add/remove players between rounds, manual sit-out control
- **Score Editing**: Edit previous round scores with automatic stat recalculation
- **Email Integration**: Automatically imports players from Pickle Planner reservation emails
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

### Email Parser Service

- IMAP email client for Pickle Planner reservations
- Automatic player roster extraction
- REST API for reservation queries
- Lightweight and Raspberry Pi compatible

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
make up

# View logs
make logs

# Stop services
make down
```

Access at **http://localhost**

**Common Commands:**

```bash
make up          # Start all services
make down        # Stop all services
make logs        # View logs
make restart     # Restart all services
make build       # Build Docker images
make clean       # Stop and remove all containers/volumes
```

### Raspberry Pi Deployment

**Complete Guide**: See [RASPBERRY_PI_GUIDE.md](RASPBERRY_PI_GUIDE.md) for full documentation

**Quick Start:**

```bash
# 1. Flash Raspberry Pi OS using Raspberry Pi Imager
# 2. Boot the Pi and complete setup wizard
# 3. Clone and install:

git clone https://github.com/bleemus/pickleball-rotation-kiosk.git
cd pickleball-rotation-kiosk
./install.sh

# 4. Reboot
sudo reboot
```

After reboot, the spectator display launches automatically in fullscreen (Firefox ESR) on the HDMI display.

**Access**:

- Admin Interface: `http://raspberrypi.local/` (or your configured hostname)
- Spectator View: Automatically displays on Pi's HDMI output

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
EMAIL_PARSER_URL=http://localhost:3002
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

**Email Parser** (`email-parser/.env`):

```bash
cp email-parser/.env.example email-parser/.env
```

```env
# Email Configuration
EMAIL_USER=your-email@example.com
EMAIL_PASSWORD=your-app-password
EMAIL_HOST=imap.gmail.com
EMAIL_PORT=993
EMAIL_TLS=true
EMAIL_CHECK_INTERVAL=5  # Check every 5 minutes

# Service Configuration
PORT=3002
```

**Gmail Setup for Email Parser:**

1. Enable IMAP in Gmail settings
2. Enable 2-Step Verification in Google Account
3. Generate an App Password:
   - Go to Google Account → Security → App Passwords
   - Select "Mail" and generate password
   - Use this password (not your regular password) in `EMAIL_PASSWORD`
4. Forward Pickle Planner reservation emails to this account

See [email-parser/README.md](email-parser/README.md) for detailed email parser setup.frontend/.env.example frontend/.env
```

```env
VITE_API_URL=http://localhost:3001/api
VITE_DEBUG_MODE=false  # Set to true to enable debug features
VITE_APP_NAME=Pickleball Kiosk  # Customize the app name shown throughout the UI
```

## Management Commands

The Makefile provides convenient commands for all operations:

```bash
make up          # Start all services with auto-detected HOST_IP
make down        # Stop all services
make logs        # View logs
make restart     # Restart all services with fresh HOST_IP
make build       # Build Docker images
make clean       # Stop and remove all containers/volumes
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
docker ps

# View logs
make logs
```

### Frontend can't connect to backend

```bash
# Verify backend is healthy
curl http://localhost:3001/health

# Check all services
docker ps

# View frontend logs
docker logs pickleball-rotation-kiosk-frontend-1
```

### Docker build issues

```bash
# Clean and rebuild
make clean
make build
make up
```

### Session data lost

- Redis data persists in Docker volume `redis-data`
- Session TTL is 24 hours by default
- To clear all data: `make clean`

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
└── RASPBERRY_PI_GUIDE.md # Complete Pi setup guide
```

### Adding Features

1. Backend: Add service logic in `backend/src/services/`
2. Frontend: Create components in `frontend/src/components/`
3. Update types in both frontend and backend
4. Add API endpoints in `backend/src/routes/`
5. Connect frontend to API in `frontend/src/hooks/useApi.ts`

### Testing

Run all tests (type checking + unit tests + E2E):

```bash
make test
```

Individual test suites:

```bash
# Backend type checking
cd backend
npm run typecheck

# Frontend type checking
cd frontend
npm run typecheck

# Frontend unit tests (Vitest)
cd frontend
npm test              # Run once
npm run test:watch    # Watch mode
npm run test:ui       # Interactive UI
npm run test:coverage # Coverage report

# E2E tests (Playwright)
npx playwright test              # Run all 16 tests
npx playwright test --ui         # Interactive mode
npx playwright test --headed     # With browser visible
npx playwright show-report       # View HTML report
```

**Test Coverage:**

- 16 Playwright E2E tests (setup, gameplay, score validation, session recovery)
- Vitest unit tests for components and hooks
- Full TypeScript type safety

See [LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md) for detailed testing guide.

## Production Deployment

### Docker (Recommended)

Already configured with:

- Health checks for all services
- Auto-restart policies
- Volume persistence for Redis
- Resource limits
- Automatic HOST_IP detection for network access

```bash
# Start all services
make up

# View status
docker ps

# View logs
make logs
```

### Systemd Service (Auto-start on boot)

See [RASPBERRY_PI_GUIDE.md](RASPBERRY_PI_GUIDE.md) for complete Raspberry Pi deployment with systemd setup.

## Documentation

- [RASPBERRY_PI_GUIDE.md](RASPBERRY_PI_GUIDE.md) - **Complete Raspberry Pi setup guide** (hardware, setup, deployment, troubleshooting)
- [QUICKSTART.md](QUICKSTART.md) - Quick deployment guide
- [LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md) - Development guide
- [CHANGELOG.md](CHANGELOG.md) - Feature changelog
- [SECURITY.md](SECURITY.md) - Security audit

## License

MIT

## Contributing

Contributions welcome! Please open an issue or submit a pull request.
