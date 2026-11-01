# Makefile for local development and testing

# Load environment variables from .env if it exists
ifneq (,$(wildcard ./.env))
    include .env
    export
endif

# Variables
PYTHON = python3
PIP = pip3
VENV = .venv
VENV_ACTIVATE = $(VENV)/bin/activate
PORT_SERVER = 8000
PORT_CLIENT = 3000
API_KEY ?= your-secret-key

# Shell configurations
.PHONY: help install run-server run-client run-dev dev docker-up docker-down docker-logs send-mock clean

# Colors for terminal output
YELLOW = \033[1;33m
GREEN  = \033[1;32m
CYAN   = \033[1;36m
RESET  = \033[0m

# Default target: display help
help:
	@echo "$(YELLOW)Commands available:$(RESET)"
	@echo "  $(CYAN)make install$(RESET)      - Create python virtualenv, install client/server dependencies, and set up .env"
	@echo "  $(CYAN)make run-server$(RESET)  - Run the backend FastAPI server locally (with hot reload)"
	@echo "  $(CYAN)make run-client$(RESET)  - Run the Next.js frontend client locally in development mode"
	@echo "  $(CYAN)make run-dev$(RESET)     - Run both client and server locally in parallel"
	@echo "  $(CYAN)make dev$(RESET)          - Start Docker containers (dev) in background, without rebuilding"
	@echo "  $(CYAN)make docker-up$(RESET)    - Build and start Docker containers for client and server in background (dev)"
	@echo "  $(CYAN)make docker-down$(RESET)  - Stop and remove Docker containers (dev)"
	@echo "  $(CYAN)make docker-logs$(RESET)  - View and follow Docker container logs (dev)"
	@echo "  $(CYAN)make send-mock$(RESET)    - Send a mock metrics JSON payload to the local running server (Docker or local)"
	@echo "  $(CYAN)make clean$(RESET)        - Remove .venv, node_modules, build cache, and database files"

# 1. Install dependencies
install:
	@echo "$(GREEN)--> Setting up local environment...$(RESET)"
	@if [ ! -f .env ]; then \
		cp .env.example .env && echo "$(YELLOW)Created .env from .env.example$(RESET)"; \
	else \
		echo "$(YELLOW).env already exists, skipping copy.$(RESET)"; \
	fi
	@echo "$(GREEN)--> Setting up Python virtual environment and installing backend dependencies...$(RESET)"
	test -d $(VENV) || $(PYTHON) -m venv $(VENV)
	. $(VENV_ACTIVATE) && $(PIP) install --upgrade pip && $(PIP) install -r server/requirements.txt
	@echo "$(GREEN)--> Installing Next.js frontend dependencies...$(RESET)"
	cd client && npm install
	@echo "$(GREEN)--> Setup complete! You can now run the services.$(RESET)"

# 2. Run servers locally (using local python/node installation)
run-server:
	@echo "$(GREEN)--> Starting FastAPI backend on http://localhost:$(PORT_SERVER)...$(RESET)"
	@if [ -d $(VENV) ]; then \
		. $(VENV_ACTIVATE) && cd server && uvicorn main:app --reload --host 0.0.0.0 --port $(PORT_SERVER); \
	else \
		cd server && uvicorn main:app --reload --host 0.0.0.0 --port $(PORT_SERVER); \
	fi

run-client:
	@echo "$(GREEN)--> Starting Next.js frontend on http://localhost:$(PORT_CLIENT)...$(RESET)"
	cd client && npm run dev -- -p $(PORT_CLIENT)

run-dev:
	@echo "$(GREEN)--> Starting both backend and frontend locally in parallel...$(RESET)"
	@make -j 2 run-server run-client

# 3. Docker Compose operations
dev:
	@echo "$(GREEN)--> Starting Docker containers (dev)...$(RESET)"
	docker compose -f docker-compose.dev.yml up -d

docker-up:
	@echo "$(GREEN)--> Building and starting Docker containers...$(RESET)"
	docker compose -f docker-compose.dev.yml up -d --build
	@echo "$(GREEN)--> Containers started! Server API is at http://localhost:8001, Client is at http://localhost:3001$(RESET)"

docker-down:
	@echo "$(GREEN)--> Stopping and removing Docker containers...$(RESET)"
	docker compose -f docker-compose.dev.yml down

docker-logs:
	docker compose -f docker-compose.dev.yml logs -f

# 4. Helper target to send test metrics (to simulate the NUC monitor script)
send-mock:
	@echo "$(GREEN)--> Sending a mock system metric to the running server...$(RESET)"
	@PORT=$$(docker ps 2>/dev/null | grep -E -q "stats-server-staging|stats-staging-server|nuc-monitor-server" && echo "8000" || echo "$(PORT_SERVER)"); \
	API_URL="http://localhost:$$PORT/api/metrics"; \
	echo "$(CYAN)Detected server on port $$PORT. Sending mock request to $$API_URL...$(RESET)"; \
	RAND_TEMP=$$(awk 'BEGIN{srand(); printf "%.1f", 40+rand()*25}'); \
	RAND_CPU=$$(awk 'BEGIN{srand(); printf "%.1f", 5+rand()*75}'); \
	RAND_RAM_PCT=$$(awk 'BEGIN{srand(); printf "%.2f", 20+rand()*60}'); \
	RAND_RAM_USE=$$(awk -v pct=$$RAND_RAM_PCT 'BEGIN{printf "%.1f", 4096*pct/100}'); \
	RAND_NET_RX=$$(awk 'BEGIN{srand(); printf "%.2f", rand()*20}'); \
	RAND_NET_TX=$$(awk 'BEGIN{srand(); printf "%.2f", rand()*10}'); \
	PAYLOAD="{\"cpu_temp\": $$RAND_TEMP, \"cpu_usage\": $$RAND_CPU, \"disk_temp\": 36.5, \"disk_usage_gb\": 14.8, \"disk_total_gb\": 59.2, \"ram_usage_mb\": $$RAND_RAM_USE, \"ram_total_mb\": 4096.0, \"ram_usage_percent\": $$RAND_RAM_PCT, \"net_rx_mb\": $$RAND_NET_RX, \"net_tx_mb\": $$RAND_NET_TX, \"uptime\": \"up 2 hours, 45 minutes\"}"; \
	echo "$(YELLOW)Payload: $$PAYLOAD$(RESET)"; \
	curl -s -X POST "$$API_URL" \
		-H "Content-Type: application/json" \
		-H "x-api-key: $(API_KEY)" \
		-d "$$PAYLOAD" | json_pp 2>/dev/null || \
	curl -s -X POST "$$API_URL" \
		-H "Content-Type: application/json" \
		-H "x-api-key: $(API_KEY)" \
		-d "$$PAYLOAD"
	@echo ""
	@echo "$(GREEN)--> Mock metric sent successfully!$(RESET)"

# 5. [DEPRECATED] Local PC monitoring script is now integrated as an hourly background worker in the backend

# 6. Clean files
clean:
	@echo "$(GREEN)--> Cleaning temporary files, caches, and databases...$(RESET)"
	rm -rf $(VENV)
	rm -rf client/.next client/node_modules client/out
	rm -rf server/__pycache__ server/*.pyc server/sql_app.db server/data/sql_app.db
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	@echo "$(GREEN)--> Cleanup finished!$(RESET)"