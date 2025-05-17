.PHONY: dev migrate ingest install-api install-web install-playwright clean

# Default to development environment variables
include .env
export $(shell sed 's/=.*//' .env)

# Variables
COMPOSE_FILE = infra/docker-compose.yml

# Commands
dev: install-api install-web install-playwright
	docker-compose -f $(COMPOSE_FILE) up --build api web playwright-runner

migrate:
	@echo "Applying Supabase migrations..."
	# TODO: Implement actual Supabase migration command. This might involve Supabase CLI or a custom script.
	# Example using Supabase CLI (ensure it's installed and configured):
	# supabase db push
	@echo "Migration command placeholder. Implement with Supabase CLI or similar."

ingest:
	@echo "Manual diff ingest utility..."
	# TODO: Implement manual diff ingest script call
	# Example: python api/app/ingest/manual_ingest_script.py --diff_file path/to/your.diff
	cd api && poetry run python -m app.ingest.manual_ingest_tool --help # Placeholder

install-api:
	@echo "Installing API dependencies..."
	cd api && poetry install --no-root

install-web:
	@echo "Installing Web dependencies..."
	cd web && npm install

install-playwright:
	@echo "Installing Playwright runner dependencies..."
	cd playwright-runner && npm install
	# Install Playwright browsers if not handled by Docker
	# cd playwright-runner && npx playwright install --with-deps

clean:
	@echo "Cleaning up Docker containers, volumes, and networks..."
	docker-compose -f $(COMPOSE_FILE) down -v --remove-orphans
	@echo "Cleaning up node_modules and .DS_Store files..."
	find . -name "node_modules" -type d -prune -exec rm -rf '{}' + 
	find . -name "poetry.lock" -type f -delete
	find . -name "pyproject.toml" -type f -not -path "./api/pyproject.toml" -delete # Be careful with this
	find . -name ".DS_Store" -type f -delete
	find . -name "__pycache__" -type d -prune -exec rm -rf '{}' +
	find . -name ".pytest_cache" -type d -prune -exec rm -rf '{}' +
	find . -name ".mypy_cache" -type d -prune -exec rm -rf '{}' +

# Ensure .env file exists, copy from example if not
.env:
	@if [ ! -f .env ]; then \
		echo "Creating .env file from env.example.txt..."; \
		cp env.example.txt .env; \
	fi 