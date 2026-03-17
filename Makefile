# OpenClaw Token Optimizer - Makefile
# Usage: make [target]   |   make help  - show targets

NPM := npm
NODE := node
DIST := dist
CLI := $(NODE) $(DIST)/src/index.js

.DEFAULT_GOAL := help

.PHONY: help install build test clean index search analyze stats maintenance setup lint

help:
	@echo "OpenClaw Token Optimizer - targets:"
	@echo "  make install     - npm install"
	@echo "  make build      - compile TypeScript to dist/"
	@echo "  make test       - run test suite (builds if needed)"
	@echo "  make clean      - remove dist/ and build artifacts"
	@echo "  make index     - index memory files (optional: make index DIR=./memory)"
	@echo "  make search    - semantic search (use: make search Q=\"your query\")"
	@echo "  make analyze   - token savings analysis"
	@echo "  make stats     - plugin statistics"
	@echo "  make maintenance - cache cleanup, index maintenance"
	@echo "  make setup     - configure OpenClaw integration"
	@echo "  make lint      - run ESLint on src/"

install:
	$(NPM) install

build:
	$(NPM) run build

test: build
	$(NPM) test

clean:
	rm -rf $(DIST)
	@echo "Cleaned $(DIST)/"

index: build
	@if [ -n "$(DIR)" ]; then \
		$(CLI) index --dir "$(DIR)"; \
	else \
		$(NPM) run index; \
	fi

search: build
	@if [ -z "$(Q)" ]; then \
		echo "Usage: make search Q=\"your search query\""; \
		exit 1; \
	fi
	$(CLI) search "$(Q)"

analyze: build
	$(NPM) run analyze

stats: build
	$(NPM) run stats

maintenance: build
	$(NPM) run maintenance

setup: build
	$(NPM) run setup

lint:
	$(NPM) run lint
