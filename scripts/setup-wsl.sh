#!/usr/bin/env bash
# =============================================================================
# GoalOS — WSL/WSL2 System Prerequisites Setup
# =============================================================================
# Installs Node.js 22, Docker Engine, corepack, and Yarn 4.9.2 inside an
# Ubuntu-based WSL or WSL2 distribution. Run once on a fresh WSL instance.
#
# Usage:
#   chmod +x scripts/setup-wsl.sh
#   ./scripts/setup-wsl.sh
# =============================================================================

set -euo pipefail

# ── Colours / helpers ─────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
fail()  { echo -e "${RED}[FAIL]${NC}  $*"; exit 1; }

# ── Pre-flight checks ────────────────────────────────────────────────────────

if [[ "$(uname -s)" != "Linux" ]]; then
  fail "This script must be run inside WSL (Linux). Detected: $(uname -s)"
fi

if [[ $EUID -eq 0 ]]; then
  fail "Do not run this script as root. It will use sudo when needed."
fi

info "Updating package lists..."
sudo apt-get update -qq

# ── 1. Node.js 22 via NodeSource ─────────────────────────────────────────────

REQUIRED_NODE_MAJOR=22

install_node() {
  info "Installing Node.js ${REQUIRED_NODE_MAJOR}.x via NodeSource..."
  sudo apt-get install -y ca-certificates curl gnupg
  sudo mkdir -p /etc/apt/keyrings

  # Add NodeSource GPG key
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
    | sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg --yes

  # Add NodeSource repo
  echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${REQUIRED_NODE_MAJOR}.x nodistro main" \
    | sudo tee /etc/apt/sources.list.d/nodesource.list > /dev/null

  sudo apt-get update -qq
  sudo apt-get install -y nodejs
}

if command -v node &>/dev/null; then
  CURRENT_MAJOR=$(node -v | sed 's/v\([0-9]*\).*/\1/')
  if [[ "$CURRENT_MAJOR" -ge "$REQUIRED_NODE_MAJOR" ]]; then
    ok "Node.js $(node -v) already installed (>= ${REQUIRED_NODE_MAJOR}.x)"
  else
    warn "Node.js $(node -v) found but ${REQUIRED_NODE_MAJOR}.x is required"
    install_node
  fi
else
  install_node
fi

ok "Node.js $(node -v)"

# ── 2. Corepack & Yarn 4.9.2 ─────────────────────────────────────────────────

info "Enabling corepack..."
corepack enable 2>/dev/null || sudo corepack enable

info "Preparing Yarn 4.9.2..."
corepack prepare yarn@4.9.2 --activate 2>/dev/null || sudo corepack prepare yarn@4.9.2 --activate

ok "Yarn $(yarn -v)"

# ── 3. Docker Engine ─────────────────────────────────────────────────────────

install_docker() {
  info "Installing Docker Engine..."

  # Remove any old/conflicting packages
  for pkg in docker.io docker-doc docker-compose podman-docker containerd runc; do
    sudo apt-get remove -y "$pkg" 2>/dev/null || true
  done

  sudo apt-get install -y ca-certificates curl gnupg
  sudo install -m 0755 -d /etc/apt/keyrings

  # Add Docker GPG key
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg --yes
  sudo chmod a+r /etc/apt/keyrings/docker.gpg

  # Determine the Ubuntu codename (works on WSL)
  # shellcheck disable=SC1091
  UBUNTU_CODENAME=$(. /etc/os-release && echo "${UBUNTU_CODENAME:-${VERSION_CODENAME}}")

  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu ${UBUNTU_CODENAME} stable" \
    | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

  sudo apt-get update -qq
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

  # Add current user to docker group so we don't need sudo
  sudo usermod -aG docker "$USER"
}

if command -v docker &>/dev/null; then
  ok "Docker $(docker --version | awk '{print $3}' | tr -d ',') already installed"
else
  install_docker
fi

# Make sure Docker daemon is running (WSL2 may need manual start)
if ! docker info &>/dev/null; then
  info "Starting Docker daemon..."
  if command -v systemctl &>/dev/null && systemctl is-system-running &>/dev/null 2>&1; then
    sudo systemctl start docker
  else
    # WSL1 or WSL2 without systemd — start dockerd directly
    sudo dockerd &>/dev/null &
    sleep 3
  fi

  if ! docker info &>/dev/null; then
    warn "Docker daemon may not be running. If you're on WSL2, consider enabling systemd:"
    warn "  Add '[boot] systemd=true' to /etc/wsl.conf and restart WSL."
    warn "  Alternatively, install Docker Desktop for Windows with WSL2 backend."
  else
    ok "Docker daemon started"
  fi
else
  ok "Docker daemon is running"
fi

# Verify docker compose plugin
if docker compose version &>/dev/null; then
  ok "Docker Compose $(docker compose version --short 2>/dev/null)"
else
  warn "docker compose plugin not found. Install it or use Docker Desktop."
fi

# ── 4. Additional useful tools ───────────────────────────────────────────────

info "Installing build essentials and git..."
sudo apt-get install -y build-essential git

# ── Summary ──────────────────────────────────────────────────────────────────

echo ""
echo -e "${GREEN}=============================================${NC}"
echo -e "${GREEN}  WSL prerequisites installed successfully!  ${NC}"
echo -e "${GREEN}=============================================${NC}"
echo ""
echo "  Node.js:          $(node -v)"
echo "  Yarn:             $(yarn -v)"
echo "  Docker:           $(docker --version 2>/dev/null || echo 'not running')"
echo "  Docker Compose:   $(docker compose version --short 2>/dev/null || echo 'not available')"
echo ""
echo "Next step: run ./scripts/setup-project.sh to set up the GoalOS project."
echo ""
if groups "$USER" 2>/dev/null | grep -qw docker; then
  true
else
  warn "You are not in the 'docker' group. Run 'sudo usermod -aG docker $USER' then log out and back in (or run 'newgrp docker')."
fi
