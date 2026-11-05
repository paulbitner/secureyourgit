.PHONY: help install dev test lint typecheck build check og-image

help: ## List targets
	@grep -E '^[a-z-]+:.*##' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  %-12s %s\n", $$1, $$2}'

install: ## Install frontend dependencies
	cd frontend && npm ci

dev: ## Run the frontend dev server
	cd frontend && npm run dev

test: ## Run unit tests
	cd frontend && npm test

lint: ## Lint
	cd frontend && npm run lint

typecheck: ## Type-check
	cd frontend && npm run typecheck

build: ## Build the pre-rendered static site into frontend/dist
	cd frontend && npm run build

check: lint typecheck test build ## Everything CI runs for the frontend

og-image: ## Re-render frontend/public/og-image.png from scripts/og-image.html (needs Google Chrome)
	cd frontend && "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --hide-scrollbars \
		--force-device-scale-factor=1 --window-size=1200,630 --screenshot=$$PWD/public/og-image.png "file://$$PWD/scripts/og-image.html"
