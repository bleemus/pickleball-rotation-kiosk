# Quick Start Guide

## Local Development (Mac/Linux/Windows)

### Prerequisites
- Node.js 20+
- Docker (for Redis)

### Option 1: Using Make (Recommended)

```bash
# 1. Install dependencies
make install

# 2. Start Redis
docker run -d -p 6379:6379 redis:7-alpine

# 3. Start development servers
make dev
```

Access:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001

### Option 2: Manual Setup

#### Start Redis
```bash
docker run -d -p 6379:6379 redis:7-alpine
```

#### Start Backend
```bash
cd backend
npm install
npm run dev
```

#### Start Frontend (in new terminal)
```bash
cd frontend
npm install
npm run dev
```

### Environment Setup

#### Backend (.env)
Create `backend/.env`:
```env
PORT=3001
REDIS_URL=redis://localhost:6379
NODE_ENV=development
```

#### Frontend (.env)
Create `frontend/.env`:
```env
VITE_API_URL=http://localhost:3001/api
VITE_DEBUG_MODE=false  # Set to 'true' to enable auto-fill debug button
```

## Docker Compose Deployment

### Quick Deploy

```bash
# Build and start all services
make up

# Or use docker-compose directly
docker-compose up -d
```

Access at **http://localhost**

### Common Commands

```bash
make up          # Start services
make down        # Stop services
make logs        # View logs
make restart     # Restart all
make clean       # Remove everything
make build       # Rebuild images
```

## Raspberry Pi Deployment

### One-Command Setup

```bash
# 1. Copy to Pi
scp -r pickleball-kiosk pi@raspberrypi.local:~/

# 2. SSH to Pi
ssh pi@raspberrypi.local
cd pickleball-kiosk

# 3. Run setup
./raspberry-pi-setup.sh

# 4. Reboot (when prompted)
sudo reboot

# 5. Deploy
cd pickleball-kiosk
docker-compose up -d
```

Access at **http://raspberrypi.local**

### Using Make Commands

```bash
# On your Pi
make pi-setup    # Run setup script
make pi-deploy   # Build and start services
make logs        # View logs
```

## First Time Use

1. Open browser to the frontend URL
2. Configure number of courts (default: 2) in the right sidebar
3. Add at least 4 × number of courts player names (max 30 characters each)
   - **Debug Mode**: If `VITE_DEBUG_MODE=true`, use "🔧 Fill" to auto-generate players
4. Click **"Start Game"**
5. View matchups on the screen (centered player names)
6. After games finish, click **"Enter Scores"**
7. Input scores (ties not allowed) and submit
8. Between rounds:
   - Add/remove players (removal requires confirmation)
   - Mark players to sit out using "Sit" button
   - Edit previous scores if needed
   - Change number of courts using "Change Courts" button
9. Click **"Start Next Round"** to continue
10. View statistics in the right sidebar (auto-scrolling)

## Troubleshooting

### Can't connect to backend
```bash
# Check backend health
curl http://localhost:3001/health
# Should return: {"status":"ok",...}
```

### Redis not connecting
```bash
# Check Redis
docker ps | grep redis

# Or with docker-compose
docker-compose ps redis
```

### Frontend shows blank page
- Check browser console for errors
- Verify `VITE_API_URL` in frontend/.env
- Ensure backend is accessible

### Port conflicts
```bash
# Check what's using the ports
lsof -i :80    # Frontend
lsof -i :3000  # Frontend dev
lsof -i :3001  # Backend
lsof -i :6379  # Redis
```

### Clean restart
```bash
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
- See [RASPBERRY_PI.md](RASPBERRY_PI.md) for kiosk mode setup
- Check API docs in README for integration

## Development Tips

### Hot Reload

Both frontend and backend support hot reload in development mode:
- Edit frontend files → browser auto-refreshes
- Edit backend files → server auto-restarts

### Type Checking

```bash
# Check types without running servers
make test

# Or manually
cd backend && npm run typecheck
cd frontend && npm run typecheck
```

### Viewing Logs

```bash
# Docker Compose
make logs

# Or specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f redis
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
docker-compose exec redis redis-cli

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
# Clean Docker cache
docker system prune -a
make build
```

### Can't access from other devices
```bash
# Frontend needs to know backend URL
# In frontend/.env, use your machine's IP
VITE_API_URL=http://192.168.1.100:3001/api

# Or on Raspberry Pi, use the Pi's hostname
VITE_API_URL=http://raspberrypi.local:3001/api
```
