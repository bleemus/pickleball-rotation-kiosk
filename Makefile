.PHONY: help build up down logs restart clean dev dev-down install test

help:
	@echo "Pickleball Kiosk - Make Commands"
	@echo "================================="
	@echo ""
	@echo "Development:"
	@echo "  make install   - Install dependencies for backend and frontend"
	@echo "  make dev       - Start development servers (backend + frontend + Redis)"
	@echo "  make dev-down  - Stop development Redis container"
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
	@echo "Checking Redis..."
	@if ! docker ps --format '{{.Names}}' | grep -q '^dev-redis$$'; then \
		echo "📦 Starting Redis container..."; \
		docker run -d --name dev-redis -p 6379:6379 redis:7-alpine; \
		echo "✅ Redis started"; \
	else \
		echo "✅ Redis already running"; \
	fi
	@echo ""
	@echo "Backend:  http://localhost:3001"
	@echo "Frontend: http://localhost:3000"
	@echo ""
	@cd backend && npm run dev & cd frontend && npm run dev

dev-down:
	@echo "🛑 Stopping development Redis container..."
	@if docker ps -a --format '{{.Names}}' | grep -q '^dev-redis$$'; then \
		docker stop dev-redis 2>/dev/null || true; \
		docker rm dev-redis 2>/dev/null || true; \
		echo "✅ Redis container stopped and removed"; \
	else \
		echo "ℹ️  Redis container not found"; \
	fi

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
	@if docker ps -a --format '{{.Names}}' | grep -q '^dev-redis$$'; then \
		echo "🛑 Stopping dev Redis container..."; \
		docker stop dev-redis 2>/dev/null || true; \
		docker rm dev-redis 2>/dev/null || true; \
	fi
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
