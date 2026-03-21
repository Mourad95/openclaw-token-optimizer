# OpenClaw Token Optimizer - Makefile
# Usage: make [target]   |   make help  - show targets

NPM := npm
NODE := node
# Embeddings + Vectra can exceed Node’s default ~4GB heap; match package.json index/analyze
NODE_HEAP := $(NODE) --max-old-space-size=8192
DIST := dist
CLI := $(NODE) $(DIST)/src/index.js
CLI_HEAP := $(NODE_HEAP) $(DIST)/src/index.js

.DEFAULT_GOAL := help

.PHONY: help install build test clean index search analyze stats metrics ask maintenance setup lint quickstart openclaw-link openclaw-link-ollama

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
	@echo "  make metrics   - cumulative token savings (persisted)"
	@echo "  make ask       - send a message to OpenClaw (use: make ask Q=\"…\")"
	@echo "  make maintenance - cache cleanup, index maintenance"
	@echo "  make setup     - configure OpenClaw integration"
	@echo "  make quickstart - build + memory sample + index + sync to OpenClaw workspace memory"
	@echo "  make openclaw-link - quickstart + OpenClaw setup (npm run openclaw:link)"
	@echo "  make openclaw-link-ollama - quickstart + Ollama setup (npm run openclaw:link:ollama)"
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
		$(CLI_HEAP) index --dir "$(DIR)"; \
	else \
		$(NPM) run index; \
	fi

search: build
	@if [ -z "$(Q)" ]; then \
		echo "Usage: make search Q=\"your search query\""; \
		exit 1; \
	fi
	$(CLI_HEAP) search "$(Q)"

analyze: build
	$(NPM) run analyze

stats: build
	$(NPM) run stats

metrics: build
	$(NPM) run metrics

ask: build
	@if [ -z "$(Q)" ]; then \
		echo "Usage: make ask Q=\"your message to OpenClaw\""; \
		exit 1; \
	fi
	$(CLI) ask "$(Q)"

maintenance: build
	$(NPM) run maintenance

setup: build
	$(NPM) run setup

quickstart:
	$(NPM) run quickstart

openclaw-link:
	$(NPM) run openclaw:link

openclaw-link-ollama:
	$(NPM) run openclaw:link:ollama

lint:
	$(NPM) run lint
