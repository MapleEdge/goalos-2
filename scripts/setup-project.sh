#!/usr/bin/env bash
# =============================================================================
# GoalOS — Project Setup
# =============================================================================
# Installs project dependencies, starts PostgreSQL via Docker Compose,
# generates the Prisma client, pushes the schema, and seeds the database.
#
# Prerequisites: Node.js 22+, Yarn 4.9.2, Docker (run setup-wsl.sh first).
#
# Usage:
#   chmod +x scripts/setup-project.sh
#   ./scripts/setup-project.sh
# =============================================================================

set -euo pipefail

# ── Colours / helpers ─────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
fail()  { echo -e "${RED}[FAIL]${NC}  $*"; exit 1; }

# ── Navigate to project root ─────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

info "Project root: $PROJECT_ROOT"

# ── Pre-flight checks ────────────────────────────────────────────────────────

REQUIRED_NODE_MAJOR=22

if ! command -v node &>/dev/null; then
  fail "Node.js not found. Run ./scripts/setup-wsl.sh first."
fi

CURRENT_MAJOR=$(node -v | sed 's/v\([0-9]*\).*/\1/')
if [[ "$CURRENT_MAJOR" -lt "$REQUIRED_NODE_MAJOR" ]]; then
  fail "Node.js ${REQUIRED_NODE_MAJOR}+ required (found $(node -v)). Run ./scripts/setup-wsl.sh first."
fi

if ! command -v yarn &>/dev/null; then
  fail "Yarn not found. Run ./scripts/setup-wsl.sh first."
fi

if ! command -v docker &>/dev/null; then
  fail "Docker not found. Run ./scripts/setup-wsl.sh first."
fi

if ! docker info &>/dev/null; then
  fail "Docker daemon is not running. Start Docker Desktop or the Docker service first."
fi

ok "Prerequisites verified — Node $(node -v), Yarn $(yarn -v), Docker running"

# ── 1. Environment file ──────────────────────────────────────────────────────

if [[ ! -f .env ]]; then
  if [[ -f .env.example ]]; then
    info "Creating .env from .env.example..."
    cp .env.example .env
    ok ".env created — edit it to add your GEMINI_API_KEY if you want AI features"
  else
    warn ".env.example not found — create .env manually (see docs/SETUP-WSL.md)"
  fi
else
  ok ".env already exists"
fi

# ── 2. Install dependencies ──────────────────────────────────────────────────

info "Installing dependencies with Yarn..."
yarn install
ok "Dependencies installed"

# ── 3. Start PostgreSQL ──────────────────────────────────────────────────────

info "Starting PostgreSQL via Docker Compose..."

# Check if port 5432 is already in use
PORT_IN_USE=false
if lsof -i :5432 &>/dev/null || ss -tlnp 2>/dev/null | grep -q ':5432 '; then
  PORT_IN_USE=true
fi

if [[ "$PORT_IN_USE" == "true" ]]; then
  # Check if it's our docker-compose container
  if docker compose ps --status running 2>/dev/null | grep -q db; then
    ok "PostgreSQL container already running"
  else
    warn "Port 5432 is already in use by another process."
    warn "If another PostgreSQL instance is running with the same credentials,"
    warn "we'll try to use it. Otherwise, stop the conflicting process and re-run."
  fi
else
  docker compose up -d
  ok "PostgreSQL container started"
fi

# Wait for PostgreSQL to accept connections (try both docker exec and direct)
info "Waiting for PostgreSQL to be ready..."
MAX_RETRIES=30
RETRY_COUNT=0
DB_READY=false
until [[ "$DB_READY" == "true" ]]; do
  # Try docker compose exec first (our own container)
  if docker compose exec -T db pg_isready -U goalos -d goalos &>/dev/null; then
    DB_READY=true
  # Fall back to checking the port directly (external postgres)
  elif pg_isready -h localhost -p 5432 &>/dev/null; then
    DB_READY=true
  # Fall back to a raw TCP check
  elif (echo >/dev/tcp/localhost/5432) &>/dev/null; then
    DB_READY=true
  fi

  if [[ "$DB_READY" != "true" ]]; then
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [[ $RETRY_COUNT -ge $MAX_RETRIES ]]; then
      fail "PostgreSQL did not become ready within ${MAX_RETRIES} seconds"
    fi
    sleep 1
  fi
done
ok "PostgreSQL is ready"

# ── 4. Prisma generate + push schema ────────────────────────────────────────

info "Generating Prisma client..."
yarn db:generate
ok "Prisma client generated"

info "Pushing schema to database..."
yarn prisma db push
ok "Database schema applied"

# ── 5. Seed the database ────────────────────────────────────────────────────

info "Seeding the database with example data..."
yarn db:seed
ok "Database seeded"

# ── Summary ──────────────────────────────────────────────────────────────────

echo ""
echo -e "${GREEN}=============================================${NC}"
echo -e "${GREEN}  GoalOS project setup complete!             ${NC}"
echo -e "${GREEN}=============================================${NC}"
echo ""
echo "  To start the dev server:"
echo ""
echo "    yarn dev"
echo ""
echo "  Or use the convenience script:"
echo ""
echo "    ./scripts/dev.sh"
echo ""
echo "  Then open http://localhost:3000 in your browser."
echo ""
echo "  Other useful commands:"
echo "    yarn lint          — run Biome linter"
echo "    yarn type-check    — run TypeScript type checking"
echo "    yarn test          — run Vitest tests"
echo "    yarn db:studio     — open Prisma Studio (database browser)"
echo ""
