# 🏃 RunCoach AI

AI-powered running coach driven by a multi-agent LLM system.

## ✅ Status: Iteration 1 Complete

**Current capabilities:**
- ✅ Multi-agent architecture (Router, Coach, Physio, Mental, Synthesizer)
- ✅ LangGraph-based orchestration
- ✅ 5 realistic mock training scenarios
- ✅ Structured LLM outputs with Zod validation
- ✅ REST API with Fastify
- ✅ Context assembly (800-1000 token summaries)

**Coming in Iteration 2:**
- Strava OAuth & data sync
- PostgreSQL database
- Redis caching
- Real-time webhooks
- User authentication

## Overview

RunCoach AI provides personalized running coaching through a multi-agent AI system:

- **Training load analysis** (CTL / ATL / TSB)
- **Personalized training plans**
- **Specialized advice** from Coach, Physio, and Mental agents
- **Injury risk detection** and overtraining prevention
- **Structured daily recommendations**

## Quick Start

### Prerequisites

- Node.js 22+
- OpenAI API key

### Installation

```bash
npm install
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
npm run dev
```

Server starts on `http://localhost:3000`

### Test the API

**List scenarios:**
```bash
curl http://localhost:3000/api/ai/scenarios
```

**Chat with overreached athlete:**
```bash
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Should I run today?", "scenarioId": "overreached"}'
```

## Available Scenarios

| ID | Name | TSB | Description |
|----|------|-----|-------------|
| `overreached` | Overreached Athlete | -25 | Severe overtraining state |
| `fresh` | Fresh Athlete | +8 | Well-recovered, ready for quality |
| `knee-pain` | Knee Pain Recovery | +1 | Returning from injury |
| `pre-competition` | Pre-Competition | +37 | Perfect taper before race |
| `burnout` | Burnout | +8 | Low motivation, inconsistent training |

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Runtime | Node.js 22 + TypeScript (strict) |
| Framework HTTP | Fastify |
| ORM | Prisma |
| Base de données | PostgreSQL 16 |
| Cache / Queues | Redis 7 + BullMQ |
| IA — Orchestration | LangGraph (JS) |
| IA — LLM | OpenAI GPT-4o / GPT-4o-mini |
| IA — Framework | LangChain.js |
| Validation | Zod |
| Auth | OAuth 2.0 Strava |
| Tests | Vitest |
| Containerisation | Docker Compose |

---

## Structure du projet

```
src/
├── api/              # Routes Fastify, middlewares, schemas Zod
├── domain/           # Logique métier pure (sans LLM)
│   ├── activity/
│   ├── aggregation/  # Calcul CTL / ATL / TSB
│   ├── feedback/
│   └── goal/
├── infra/
│   ├── db/           # Prisma client, repositories
│   ├── strava/       # OAuth + webhook + sync
│   ├── queue/        # BullMQ workers
│   └── cache/        # Redis helpers
├── ai/
│   ├── graph/        # Définition du graphe LangGraph
│   ├── agents/       # coach, kine, mental
│   ├── tools/        # Tools LangChain par agent
│   ├── prompts/      # System prompts versionnés
│   └── context/      # Assemblage du contexte LLM
└── shared/
    ├── types/        # Types partagés
    ├── errors/
    └── utils/
```

---

## Documentation

| Fichier | Description |
|---------|-------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Vue d'ensemble des composants et flux de données |
| [AGENTS.md](./AGENTS.md) | Définition des agents IA, router, structured outputs |
| [DATA_MODEL.md](./DATA_MODEL.md) | Schéma complet de la base de données |
| [ITERATION_1.md](./ITERATION_1.md) | Scope et tâches de la première itération |

---

## Démarrage rapide

### Prérequis

- Node.js 22+
- Docker + Docker Compose
- Compte développeur Strava (Client ID + Secret)
- Clé API OpenAI

### Installation

```bash
git clone <repo>
cd runcoach-ai
cp .env.example .env   # remplir les variables
npm install
docker compose up -d   # démarre PostgreSQL + Redis
npm run db:migrate
npm run dev
```

### Variables d'environnement

```env
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
STRAVA_WEBHOOK_VERIFY_TOKEN=   # token arbitraire pour valider le webhook Strava

# OpenAI
OPENAI_API_KEY=

# Sécurité
JWT_SECRET=
ENCRYPTION_KEY=   # AES-256 pour chiffrer les tokens Strava (32 bytes hex)
```

---

## Scripts disponibles

```bash
npm run dev          # Dev avec hot-reload (tsx watch)
npm run build        # Compilation TypeScript
npm run start        # Production
npm run db:migrate   # Applique les migrations Prisma
npm run db:seed      # Données de test
npm run test         # Vitest
npm run test:watch
npm run lint
npm run typecheck
```

---

## Principes de développement

**Séparation stricte métier / IA**
La couche `domain/` ne connaît pas les LLMs. Elle produit des agrégats que la couche `ai/` consomme. Un bug dans les calculs CTL/ATL est un bug métier, pas un bug IA.

**Structured outputs obligatoires**
Tous les outputs des agents sont validés par un schema Zod. Aucun texte libre ne quitte la couche IA sans être parsé et validé.

**Contexte assemblé backend**
Le LLM ne reçoit jamais de JSON brut Strava. Il reçoit un résumé sémantique calculé par `ai/context/`, limité à ~1000 tokens de données.

**Pas d'état dans les agents**
Les nodes LangGraph sont des fonctions pures. Tout l'état transite par le `GraphState`.