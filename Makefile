.PHONY: help build up down logs restart clean dev install test

help:
	@echo "Pickleball Kiosk - Make Commands"
	@echo "================================="
	@echo ""
	@echo "Development:"
	@echo "  make install   - Install dependencies for backend and frontend"
	@echo "  make dev       - Start development servers (backend + frontend)"
	@echo "  make test      - Run type checking"
	@echo ""
	@echo "Docker:"
	@echo "  make build     - Build Docker images"
	@echo "  make up        - Start services with auto-detected HOST_IP"
	@echo "  make down      - Stop all services"
	@echo "  make logs      - View logs (all services)"
	@echo "  make restart   - Restart all services with fresh HOST_IP"
	@echo "  make clean     - Remove all containers and volumes"

# Development commands
install:
	@echo "📦 Installing backend dependencies..."
	@cd backend && npm install
	@echo "📦 Installing frontend dependencies..."
	@cd frontend && npm install
	@echo "✅ Dependencies installed!"

dev:
	@echo "🚀 Starting development servers..."
	@echo ""
	@echo "Backend:  http://localhost:3001"
	@echo "Frontend: http://localhost:3000"
	@echo ""
	@echo "Make sure Redis is running:"
	@echo "  docker run -d -p 6379:6379 redis:7-alpine"
	@echo ""
	@cd backend && npm run dev & cd frontend && npm run dev

test:
	@echo "🔍 Running type checks..."
	@cd backend && npm run typecheck
	@cd frontend && npm run typecheck
	@echo "✅ Type checking complete!"

# Docker Compose commands
build:
	@echo "🔨 Building Docker images..."
	@docker-compose build

up:
	@echo "🚀 Starting services..."
	@export HOST_IP=$$(./get-host-ip.sh) && docker-compose up -d
	@echo "✅ Services started!"
	@echo ""
	@echo "Frontend: http://localhost"
	@echo "Backend:  http://localhost:3001"
	@echo "Health:   http://localhost:3001/health"

down:
	@docker-compose down
	@echo "✅ Services stopped"

logs:
	@docker-compose logs -f

restart:
	@echo "🔄 Restarting services..."
	@export HOST_IP=$$(./get-host-ip.sh) && docker-compose down && docker-compose up -d
	@echo "✅ Services restarted"

clean:
	@docker-compose down -v
	@echo "✅ All containers and volumes removed"
