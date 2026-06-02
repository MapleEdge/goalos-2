# Windows / WSL Development Setup

Step-by-step guide for setting up GoalOS on Windows using WSL2 (Windows Subsystem for Linux).

## Overview

The setup is split into three stages:

| Stage | Script | What it does |
|-------|--------|-------------|
| 1. Install WSL2 | `scripts/install-wsl.ps1` | Enables WSL2 and installs Ubuntu (Windows side) |
| 2. System prerequisites | `scripts/setup-wsl.sh` | Installs Node.js 22, Docker, Yarn 4.9.2 (WSL side) |
| 3. Project setup | `scripts/setup-project.sh` | Installs deps, starts DB, runs migrations, seeds data |

A convenience script `scripts/dev.sh` is also provided for day-to-day development startup.

---

## Step 1: Install WSL2

> Skip this step if you already have WSL2 with an Ubuntu distribution.

Open **PowerShell as Administrator** and run:

```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force
.\scripts\install-wsl.ps1
```

This will:
- Enable the WSL2 feature
- Install the Ubuntu distribution
- Prompt you to reboot if required

After rebooting, open **Ubuntu** from the Start menu and create your Linux user account.

### Alternative: Docker Desktop

If you prefer Docker Desktop for Windows instead of running Docker inside WSL:
1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) 
2. In Docker Desktop settings, enable **WSL 2 based engine** and integrate with your Ubuntu distro
3. When running `setup-wsl.sh`, Docker will already be available — the script will detect it and skip Docker installation

---

## Step 2: Install System Prerequisites

Open your **WSL Ubuntu terminal** and navigate to the GoalOS repo:

```bash
# If the repo is on your Windows filesystem:
cd /mnt/c/Users/<YourUsername>/path/to/goalos

# Or clone it directly inside WSL for better performance:
git clone <repo-url> ~/goalos && cd ~/goalos
```

> **Performance tip:** For significantly faster file I/O, clone the repo inside the WSL filesystem (`~/goalos`) rather than on the Windows mount (`/mnt/c/...`).

Run the system setup script:

```bash
chmod +x scripts/*.sh
./scripts/setup-wsl.sh
```

This installs:
- **Node.js 22** via NodeSource
- **Corepack + Yarn 4.9.2**
- **Docker Engine** + Docker Compose plugin
- **build-essential** and **git**

If you were added to the `docker` group, log out and back in (or run `newgrp docker`) before proceeding.

---

## Step 3: Set Up the Project

```bash
./scripts/setup-project.sh
```

This will:
1. Create `.env` from `.env.example` (if it doesn't exist)
2. Install Node.js dependencies via Yarn
3. Start PostgreSQL in a Docker container
4. Generate the Prisma client
5. Push the database schema
6. Seed the database with example data

### Environment Variables

Edit `.env` to configure optional settings:

```env
DATABASE_URL="postgresql://goalos:goalos_dev@localhost:5432/goalos?schema=public"

# Optional — enables AI-powered goal suggestions, intent parsing, and reasoning
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.5-flash
```

Get a Gemini API key at [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey). The app works without it — all AI features fall back gracefully.

---

## Daily Development

Use the convenience script to start everything:

```bash
./scripts/dev.sh
```

This ensures PostgreSQL is running and starts the Next.js dev server with Turbopack. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Useful Commands

| Command | Description |
|---------|-------------|
| `yarn dev` | Start dev server (Turbopack) |
| `yarn build` | Production build |
| `yarn lint` | Run Biome linter |
| `yarn lint:fix` | Auto-fix lint issues |
| `yarn type-check` | TypeScript type checking |
| `yarn test` | Run Vitest tests |
| `yarn db:studio` | Open Prisma Studio (DB browser) |
| `yarn db:seed` | Re-seed the database |

### Stopping Services

```bash
# Stop the dev server: Ctrl+C

# Stop PostgreSQL
docker compose down

# Stop PostgreSQL and delete all data
docker compose down -v
```

---

## Troubleshooting

### Port 5432 already in use

Another PostgreSQL instance may be running. Check with:

```bash
sudo lsof -i :5432
# or
ss -tlnp | grep 5432
```

Stop the conflicting service or change the port in `docker-compose.yml` and `DATABASE_URL`.

### Docker daemon not running

If you see "Cannot connect to the Docker daemon":

```bash
# With systemd (WSL2 with systemd enabled):
sudo systemctl start docker

# Without systemd:
sudo dockerd &
```

To enable systemd in WSL2, add to `/etc/wsl.conf`:

```ini
[boot]
systemd=true
```

Then restart WSL from PowerShell: `wsl --shutdown`

### Slow file performance on /mnt/c

Working on files in `/mnt/c/...` is significantly slower than the native WSL filesystem. For best performance, clone the repo inside WSL:

```bash
git clone <repo-url> ~/goalos
```

Your IDE (e.g., VS Code) can connect to WSL via the [Remote - WSL extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-wsl).

### Node.js version conflicts

If you have nvm or another Node version manager, make sure Node 22+ is active:

```bash
node -v   # should be v22.x or higher
```
