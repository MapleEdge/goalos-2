#!/usr/bin/env bash
# =============================================================================
# GoalOS — Development Server Launcher
# =============================================================================
# Ensures Docker/PostgreSQL are running and starts the Next.js dev server.
# Use this as a quick one-command start for daily development.
#
# Usage:
#   ./scripts/dev.sh
# =============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
fail()  { echo -e "${RED}[FAIL]${NC}  $*"; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# ── Ensure Docker is running ─────────────────────────────────────────────────

if ! docker info &>/dev/null 2>&1; then
  fail "Docker is not running. Start Docker Desktop or the Docker service first."
fi

# ── Start PostgreSQL if not running ──────────────────────────────────────────

if ! docker compose ps --status running 2>/dev/null | grep -q db; then
  info "Starting PostgreSQL..."
  docker compose up -d
  # Wait for readiness
  until docker compose exec -T db pg_isready -U goalos -d goalos &>/dev/null 2>&1; do
    sleep 1
  done
  ok "PostgreSQL is ready"
else
  ok "PostgreSQL already running"
fi

# ── Start the dev server ─────────────────────────────────────────────────────

info "Starting Next.js dev server on http://localhost:3000 ..."
echo ""
exec yarn dev
