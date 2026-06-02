# GoalOS

A state engine for achieving long-term goals through graph-based reasoning.

GoalOS is not a CRM, task manager, note-taking app, or knowledge base. It is the **reasoning layer** that sits above your existing tools (Obsidian, Notion, Gmail, Calendar, Attio, etc.) and continuously answers:

- What should I do next?
- What prerequisite is currently blocking progress?
- Which relationship matters most right now?
- What assumption should I validate next?
- What information is missing?

## Architecture

### Layer 1: Data Sources (Connectors)

Pluggable connectors for Obsidian, Notion, Gmail, Google Calendar, Attio, and CSV imports. Currently mocked — designed for future integration without replacing existing tools.

### Layer 2: State Graph

Core entities connected as a graph:

- **Goals** — with target dates, success criteria, and status tracking
- **Stakeholders** — people, their organizations, relationship strength, and interaction history
- **Prerequisites** — conditions that must exist before a goal can advance, with confidence scores
- **Evidence** — proof that prerequisites have been satisfied
- **Actions** — concrete next steps with priority and due dates
- **Relationships** — typed edges connecting any entities in the graph

All state changes are event-sourced for full auditability.

### Layer 3: Reasoning Engine

Analyzes the graph state to produce:

- **Highest-Leverage Next Actions** — ranked by which actions unblock the most prerequisites
- **Missing Prerequisites** — sorted by lowest confidence, highlighting gaps
- **Important Relationships** — stakeholders connected to active goals, flagging stale contacts
- **Uncertainty Reduction** — questions and actions that would most improve decision quality
- **Readiness Scores** — per-goal readiness percentage based on prerequisite completion and confidence

### Layer 4: AI Enhancement (Optional)

Powered by Google Gemini (via the `@google/genai` SDK), used for:
- Strategic reasoning insights over the graph
- AI-powered goal suggestions
- Natural-language command/intent parsing

AI consumes graph state and produces natural-language strategic advice. The graph remains fully useful without AI — every feature falls back gracefully when `GEMINI_API_KEY` is unset.

### Layer 5: User Interface

- **Dashboard** — goals, blockers, readiness gauges, recommendations
- **Graph View** — React Flow visualization of the full state graph
- **Timeline** — chronological event log of all state changes

## Tech Stack

- **Next.js 16** (App Router, Turbopack)
- **TypeScript** (strict mode)
- **PostgreSQL** via Docker
- **Prisma 7** (with `@prisma/adapter-pg`)
- **React Flow** (`@xyflow/react`)
- **Tailwind CSS v4**
- **Google Gemini** via `@google/genai` (for AI integration)

## Getting Started

### Prerequisites

- Node.js 22+
- Docker & Docker Compose
- Yarn 4.9.2 (via corepack)

### Quick Setup (Windows / WSL)

Automated scripts handle the full setup on a Windows machine with WSL or WSL2. See [docs/SETUP-WSL.md](docs/SETUP-WSL.md) for detailed instructions, or follow the quick start below:

```powershell
# 1. (Windows PowerShell, run as Administrator) Install WSL2 + Ubuntu
Set-ExecutionPolicy Bypass -Scope Process -Force
.\scripts\install-wsl.ps1
```

```bash
# 2. (Inside WSL Ubuntu terminal) Install system dependencies
chmod +x scripts/*.sh
./scripts/setup-wsl.sh

# 3. Set up the project (deps, database, seed data)
./scripts/setup-project.sh

# 4. Start developing
./scripts/dev.sh
```

Open [http://localhost:3000](http://localhost:3000).

### Manual Setup

```bash
# Clone the repo
git clone <repo-url> && cd goalos

# Install dependencies
yarn install

# Start PostgreSQL
docker compose up -d

# Generate Prisma client and push schema
npx prisma generate
npx prisma db push

# Seed with example data
yarn db:seed

# Start dev server
yarn dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

Copy `.env.example` to `.env` and configure:

```env
DATABASE_URL="postgresql://goalos:goalos_dev@localhost:5432/goalos?schema=public"

# Optional AI config (powered by Google Gemini)
# Get a key at https://aistudio.google.com/apikey
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.5-flash
```

### Scripts

| Command | Description |
|---------|-------------|
| `yarn dev` | Start dev server |
| `yarn build` | Production build |
| `yarn lint` | Run Biome linter |
| `yarn db:generate` | Generate Prisma client |
| `yarn prisma db push` | Push schema to database |
| `yarn db:seed` | Seed example data |
| `yarn db:studio` | Open Prisma Studio |

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| GET/POST | `/api/goals` | List/create goals |
| GET/PATCH/DELETE | `/api/goals/[id]` | Read/update/delete goal |
| GET/POST | `/api/stakeholders` | List/create stakeholders |
| GET/PATCH/DELETE | `/api/stakeholders/[id]` | Read/update/delete stakeholder |
| GET/POST | `/api/prerequisites` | List/create prerequisites |
| GET/PATCH/DELETE | `/api/prerequisites/[id]` | Read/update/delete prerequisite |
| GET/POST | `/api/evidence` | List/create evidence |
| GET/PATCH/DELETE | `/api/evidence/[id]` | Read/update/delete evidence |
| GET/POST | `/api/actions` | List/create actions |
| GET/PATCH/DELETE | `/api/actions/[id]` | Read/update/delete action |
| GET/POST | `/api/relationships` | List/create graph relationships |
| GET | `/api/reasoning` | Get graph-based recommendations |
| POST | `/api/reasoning` | Get recommendations + AI insight |
| GET | `/api/events` | Get event timeline |
| GET/POST | `/api/connectors` | List/import from data connectors |

## Design Principles

1. **State maintenance over productivity features** — optimize for tracking state across months and years
2. **Graph-native** — all entities and relationships form a queryable graph
3. **Event-sourced** — every change is recorded, every recommendation is traceable to graph data
4. **AI-optional** — the reasoning engine works without AI; AI enhances, not replaces
5. **Tool-agnostic** — designed to sit above existing tools, not replace them
