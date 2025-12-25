.PHONY: help build up down logs restart clean dev dev-down install test test-unit test-e2e test-all test-ui email-logs email-health email-check

help:
	@echo "Pickleball Kiosk - Make Commands"
	@echo "================================="
	@echo ""
	@echo "Development:"
	@echo "  make install      - Install dependencies for backend, frontend, and email-parser"
	@echo "  make dev          - Start development servers (backend + frontend + email-parser + Redis)"
	@echo "  make dev-down     - Stop development Redis container"
	@echo "  make test         - Run type checking"
	@echo ""
	@echo "Testing:"
	@echo "  make test-unit    - Run unit tests (Vitest)"
	@echo "  make test-e2e     - Run E2E tests (Playwright)"
	@echo "  make test-all     - Run all tests (type check + unit + E2E)"
	@echo "  make test-ui      - Open Vitest UI"
	@echo ""
	@echo "Docker:"
	@echo "  make build        - Build Docker images (redis + backend + frontend + email-parser)"
	@echo "  make up           - Start all services with auto-detected HOST_IP"
	@echo "  make down         - Stop all services"
	@echo "  make logs         - View logs (all services)"
	@echo "  make restart      - Restart all services with fresh HOST_IP"
	@echo "  make clean        - Remove all containers and volumes"
	@echo ""
	@echo "Email Parser:"
	@echo "  make email-logs   - View email-parser logs"
	@echo "  make email-health - Check email-parser health"
	@echo "  make email-check  - Manually trigger email check"

# Development commands
install:
	@echo "📦 Installing backend dependencies..."
	@cd backend && npm install
	@echo "📦 Installing frontend dependencies..."
	@cd frontend && npm install
	@echo "📦 Installing email-parser dependencies..."
	@cd email-parser && npm install
	@echo "✅ All dependencies installed!"

dev:
	@echo "🚀 Starting development servers..."
	@echo ""
	@echo "Checking Redis..."
	@if docker ps --format '{{.Names}}' | grep -q '^dev-redis$$'; then \
		echo "✅ Redis already running"; \
	elif docker ps -a --format '{{.Names}}' | grep -q '^dev-redis$$'; then \
		echo "📦 Starting existing Redis container..."; \
		docker start dev-redis; \
		echo "✅ Redis started"; \
	else \
		echo "📦 Creating new Redis container..."; \
		docker run -d --name dev-redis -p 6379:6379 redis:7-alpine; \
		echo "✅ Redis created and started"; \
	fi
	@echo ""
	@echo "Starting services:"
	@echo "  Backend:      http://localhost:3001"
	@echo "  Frontend:     http://localhost:3000"
	@echo "  Email Parser: http://localhost:3002"
	@echo ""
	@cd backend && npm run dev & cd frontend && npm run dev & cd email-parser && npm run dev

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
	@cd email-parser && npm run typecheck
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
	@echo "Access points:"
	@echo "  Frontend:     http://localhost"
	@echo "  Backend:      http://localhost:3001"
	@echo "  Email Parser: http://localhost:3002"
	@echo ""
	@echo "Health checks:"
	@echo "  Backend:      http://localhost:3001/health"
	@echo "  Email Parser: http://localhost:3002/health"

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

# Testing commands
test-unit:
	@echo "🧪 Running unit tests (Vitest)..."
	@cd frontend && npm run test:unit
	@echo "✅ Unit tests complete!"

test-e2e:
	@echo "🎭 Running E2E tests (Playwright)..."
	@echo "Ensuring Redis is running..."
	@if [ "$$CI" = "true" ] || [ "$$GITHUB_ACTIONS" = "true" ]; then \
		echo "✅ CI detected; using existing Redis service"; \
	elif ! docker ps --format '{{.Names}}' | grep -q '^dev-redis$$'; then \
		echo "📦 Starting Redis container..."; \
		docker run -d --name dev-redis -p 6379:6379 redis:7-alpine; \
		echo "✅ Redis started"; \
	else \
		echo "✅ Redis already running"; \
	fi
	@npm run test:e2e
	@echo "✅ E2E tests complete!"

test-all:
	@echo "🚀 Running all tests..."
	@make test
	@make test-unit
	@make test-e2e

# Email Parser commands
email-logs:
	@echo "📧 Email parser logs:"
	@docker-compose logs -f email-parser

email-health:
	@echo "📧 Checking email-parser health..."
	@curl -s http://localhost:3002/health | python3 -m json.tool || echo "❌ Email parser not responding"

email-check:
	@echo "📧 Manually triggering email check..."
	@curl -X POST http://localhost:3002/api/check-emails
	@echo "✅ Email check triggered!"

test-ui:
	@echo "🎨 Opening Vitest UI..."
	@cd frontend && npm run test:ui
