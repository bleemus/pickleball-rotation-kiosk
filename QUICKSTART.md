# Quick Start Guide

## Docker Deployment (Recommended)

### Prerequisites

- Docker & Docker Compose

### Quick Deploy

```bash
# Clone the repository
git clone https://github.com/bleemus/pickleball-rotation-kiosk.git
cd pickleball-rotation-kiosk

# Start all services
make up
```

Access at **http://localhost**

### Common Commands

```bash
make up          # Start all services
make down        # Stop all services
make logs        # View logs
make restart     # Restart all services
make build       # Build Docker images
make clean       # Stop and remove all containers/volumes
```

## Local Development (Mac/Linux/Windows)

For active development with hot-reload:

### Prerequisites

- Node.js 20+
- Docker & Docker Compose

### Quick Setup

```bash
# 1. Install dependencies
cd backend && npm install
cd ../frontend && npm install

# 2. Start Redis only
docker compose up -d redis

# 3. Start development servers (in separate terminals)
cd backend && npm run dev    # Backend: http://localhost:3001
cd frontend && npm run dev   # Frontend: http://localhost:3000
```

### Using Make (Alternative)

```bash
# Install dependencies
make install

# Start Redis
docker compose up -d redis

# Start dev servers
make dev
```

### Environment Setup (Optional)

Environment variables are optional for Docker Compose (defaults are provided).

For local development, create:

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
VITE_DEBUG_MODE=false  # Set to true to enable auto-fill debug button
VITE_APP_NAME=Pickleball Kiosk  # Customize the app name shown in the UI
```

## Raspberry Pi Deployment

### Quick Setup (Recommended)

**Prerequisites:**

- Raspberry Pi OS installed (use Raspberry Pi Imager)
- Complete the initial setup wizard
- Pi connected to network

**Installation:**

```bash
# 1. Clone repository on the Pi
git clone https://github.com/bleemus/pickleball-rotation-kiosk.git
cd pickleball-rotation-kiosk

# 2. Run the installer
./install.sh

# 3. Reboot
sudo reboot
```

After reboot, the spectator display launches automatically in fullscreen!

**What the installer does:**

- Installs unclutter (cursor hiding)
- Installs Docker & Docker Compose
- Builds and starts the application
- Configures kiosk mode (spectator auto-launches)
- Sets up auto-start on boot

**Access:**

- Admin interface: `http://raspberrypi.local/` (or your hostname)
- Spectator display: Automatically launches on HDMI

**Management:**

```bash
cd ~/pickleball-rotation-kiosk

# Stop/start application
make down
make up

# View logs
make logs

# Restart
make restart
```

## First Time Use

1. Open browser to the frontend URL
2. Configure number of courts (default: 2) in the right sidebar
3. Add at least 4 × number of courts player names (max 30 characters each)
   - **Debug Mode**: If `VITE_DEBUG_MODE=true`, use "🔧 Fill" to auto-generate players
4. Click **"Start Game"**
5. View matchups on the screen (centered player names)
6. After games finish, click **"Enter Scores"**
7. Input scores (ties not allowed, numeric keyboard on mobile)
8. Between rounds:
   - Add/remove players (removal requires confirmation)
   - Mark players to sit out using "Sit" button
   - Edit previous scores if needed
   - Change number of courts using "Change Courts" button
9. Click **"Start Next Round"** to continue
10. View statistics in the right sidebar (auto-scrolling)
11. **Optional**: Open `/spectator` on a second screen for full-screen stats display
12. **Need Help?**: Click the **?** button (bottom right) for comprehensive instructions

## Troubleshooting

### Can't connect to backend

```bash
# Check backend health
curl http://localhost:3001/health
# Should return: {"status":"ok",...}

# Check services
docker ps
```

### Redis not connecting

```bash
# Check Redis container status
docker ps | grep redis

# View Redis logs
docker logs pickleball-rotation-kiosk-redis-1
```

### Frontend shows blank page

- Check browser console for errors
- Verify services are running: `docker ps`
- Check logs: `docker logs pickleball-rotation-kiosk-frontend-1`

### Port conflicts

```bash
# Check what's using the ports
lsof -i :80    # Frontend (Docker)
lsof -i :3000  # Frontend (dev)
lsof -i :3001  # Backend
lsof -i :6379  # Redis
```

### Clean restart

```bash
# Clean and rebuild
make clean
make build
make up
```

## Access Points

**Local Development:**

- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- Health: http://localhost:3001/health

**Docker Compose:**

- Frontend: http://localhost
- Backend: http://localhost:3001
- Health: http://localhost:3001/health

**Raspberry Pi:**

- Frontend: http://raspberrypi.local
- Backend: http://raspberrypi.local:3001

## Default Ports

- Frontend (production): `80`
- Frontend (development): `3000`
- Backend: `3001`
- Redis: `6379` (internal only)

## Next Steps

- See [README.md](README.md) for complete documentation
- See [RASPBERRY_PI_GUIDE.md](RASPBERRY_PI_GUIDE.md) for kiosk mode setup
- Check API docs in README for integration

## Development Tips

### Hot Reload

Both frontend and backend support hot reload in development mode:

- Edit frontend files → browser auto-refreshes
- Edit backend files → server auto-restarts

### Type Checking & Testing

```bash
# Run all tests (type checking + unit tests + E2E)
make test

# Or run individually:
cd backend && npm run typecheck    # Backend types
cd frontend && npm run typecheck   # Frontend types
cd frontend && npm test            # Unit tests
npx playwright test                # E2E tests (16 tests)
```

See [LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md) for detailed testing documentation.

### Viewing Logs

```bash
# All services
make logs

# Individual containers
docker logs pickleball-rotation-kiosk-backend-1
docker logs pickleball-rotation-kiosk-frontend-1
docker logs pickleball-rotation-kiosk-redis-1
```

### Debugging

#### Backend debugging

```bash
cd backend
npm run dev
# Look for console output
```

#### Frontend debugging

- Open browser DevTools (F12)
- Check Console tab for errors
- Check Network tab for API calls

### Database Management

```bash
# Connect to Redis CLI
docker exec -it pickleball-rotation-kiosk-redis-1 redis-cli

# Check keys
KEYS *

# Get session data
GET session:your-session-id

# Clear all data
FLUSHALL
```

## Common Issues

### npm install fails

```bash
# Clear cache and retry
npm cache clean --force
cd backend && rm -rf node_modules && npm install
cd frontend && rm -rf node_modules && npm install
```

### Docker build fails

```bash
# Clean Docker cache and rebuild
docker system prune -a
make clean
make build
make up
```

### Can't access from other devices

```bash
# Frontend needs to know backend URL
# In frontend/.env, use your machine's IP
VITE_API_URL=http://192.168.1.100:3001/api

# Or on Raspberry Pi, use the Pi's hostname
VITE_API_URL=http://raspberrypi.local:3001/api
```
