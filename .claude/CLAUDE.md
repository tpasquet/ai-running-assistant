# 🏃 RunCoach AI

AI-powered running coach application driven by specialized multi-agent system.

## Current State (2026-04-03)

**Iteration 1 (AI Core) — COMPLETE ✅**
- LangGraph multi-agent graph operational (mock data)
- Agents: Router, Coach, Physio, Mental, Synthesizer
- 3 LangChain tools implemented (getSimilarSessions, getPainHistory, getMoodTrend)
- API: `POST /ai/chat`, `POST /ai/daily-recommendation`, `GET /ai/scenarios`
- All tests passing (`npm test`) — no Docker/DB needed

**Iteration 2 (Backend) — NEXT ⏳**
- Strava OAuth + sync, PostgreSQL (Prisma), Redis, BullMQ
- Replace mock adapters with real repositories
- See `.claude/roadmap/iteration-2-scope.md`

## Overview

RunCoach AI connects your Strava training data to a multi-agent LLM system capable of:

- Analyzing your training load (CTL / ATL / TSB)
- Generating personalized training plans
- Answering questions via three specialized agents (Coach, Physio, Mental)
- Detecting injury and overtraining risks
- Producing structured daily recommendations

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 22 + TypeScript (strict) |
| HTTP Framework | Fastify |
| ORM | Prisma |
| Database | PostgreSQL 16 |
| Cache / Queues | Redis 7 + BullMQ |
| AI — Orchestration | LangGraph (JS) |
| AI — LLM | OpenAI GPT-4o / GPT-4o-mini |
| AI — Framework | LangChain.js |
| Validation | Zod |
| Auth | OAuth 2.0 Strava |
| Tests | Vitest |
| Containerization | Docker Compose |

## Project Structure

```
src/
├── ai/               # ✅ EXISTS — LangGraph multi-agent layer
│   ├── graph/        # LangGraph definition + nodes
│   ├── tools/        # LangChain tools (mock adapters)
│   ├── prompts/      # Versioned system prompts
│   ├── context/      # LLM context assembly
│   ├── schemas/      # Zod output schemas per agent
│   └── mocks/        # Mock fixtures (5 scenarios)
├── api/              # ✅ EXISTS — Fastify routes
├── shared/           # ✅ EXISTS — types, errors, utils
├── domain/           # ⏳ ITERATION 2 — pure business logic (no LLM)
│   ├── activity/
│   ├── aggregation/  # CTL / ATL / TSB calculations
│   ├── feedback/
│   └── goal/
└── infra/            # ⏳ ITERATION 2 — external interfaces
    ├── db/           # Prisma client, repositories
    ├── strava/       # OAuth + webhook + sync
    ├── queue/        # BullMQ workers
    └── cache/        # Redis helpers
```

## Documentation

### Product Specifications (`.claude/specs/`)

| File | Description |
|------|-------------|
| specs/ARCHITECTURE.md | Components and data flow overview |
| specs/AGENTS.md | AI agents definition, router, structured outputs |
| specs/DATA_MODEL.md | Complete database schema |
| specs/AUTH.md | Authentication — email/pwd, Google, Apple, Strava (données) |

### Development Roadmap (`.claude/roadmap/`)

| File | Description |
|------|-------------|
| roadmap/iteration-1-scope.md | **AI core** - LangGraph/LangChain with mock data |
| roadmap/iteration-1-tasks.md | AI development tasks (agents, tools, prompts) |
| roadmap/iteration-2-scope.md | **Backend** - Strava, PostgreSQL, Redis, API |
| roadmap/iteration-2-tasks.md | Backend development tasks (OAuth, sync, DB) |

**Development order**: Start with AI layer (iteration 1) using mocks, then connect real backend (iteration 2).

## Quick Start

### Prerequisites

- Node.js 22+
- Docker + Docker Compose
- Strava Developer Account (Client ID + Secret)
- OpenAI API Key

### Installation

```bash
# Iteration 1 (current — no Docker needed):
git clone <repo>
cd runcoach-ai
cp .env.example .env          # only OPENAI_API_KEY required for now
npm install --legacy-peer-deps  # --legacy-peer-deps required (LangGraph conflicts)
npm run dev                   # runs on port 3000 with mock data

# Iteration 2 (not yet started — requires Docker):
docker compose up -d          # starts PostgreSQL + Redis
npm run db:migrate
npm run dev
```

### Environment Variables

```bash
# App
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/runcoach

# Redis
REDIS_URL=redis://localhost:6379

# Strava
STRAVA_CLIENT_ID=
STRAVA_CLIENT_SECRET=
STRAVA_WEBHOOK_VERIFY_TOKEN=   # arbitrary token to validate Strava webhook

# OpenAI
OPENAI_API_KEY=

# Security
JWT_SECRET=
ENCRYPTION_KEY=   # AES-256 to encrypt Strava tokens (32 bytes hex)
```

### Available Scripts

```bash
npm run dev          # Dev with hot-reload (tsx watch)
npm run build        # TypeScript compilation
npm run start        # Production
npm run db:migrate   # Apply Prisma migrations
npm run db:seed      # Test data
npm run test         # Vitest
npm run test:watch
npm run lint
npm run typecheck
```

## Known Gotchas

- **npm install** requires `--legacy-peer-deps` (LangGraph peer dep conflicts)
- **ESM**: project uses `"type": "module"` — imports must use `.js` extension
- **Agents are sequential** (not parallel) in iteration 1 — parallel execution planned for iteration 2
- **No Docker/DB needed** for iteration 1 — runs entirely on mock data in `src/ai/mocks/`
- **Strava fields**: API returns `moving_time` (not `duration`), speed in m/s (convert to sec/km for pace)

## Development Principles

> See `.claude/CODING_STANDARDS.md` for full coding rules.
> See `.claude/WORKFLOW.md` for how to work with Claude Code on this project.

**Strict separation: business / AI** - The `domain/` layer doesn't know about LLMs. It produces aggregates that the `ai/` layer consumes. A bug in CTL/ATL calculations is a business bug, not an AI bug.

**Mandatory structured outputs** - All agent outputs are validated by Zod schemas. No free text leaves the AI layer without being parsed and validated.

**Backend-assembled context** - The LLM never receives raw Strava JSON. It receives a semantic summary computed by `ai/context/`, limited to ~1000 tokens of data.

**Stateless agents** - LangGraph nodes are pure functions. All state flows through GraphState.
