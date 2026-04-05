# Technical Architecture

## Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                          CLIENT                                 │
│                  (Mobile / Web — out of scope MVP)              │
└──────────────────────────┬──────────────────────────────────────┘
                           │ REST + SSE
┌──────────────────────────▼──────────────────────────────────────┐
│                      API LAYER (Fastify)                        │
│                                                                 │
│   /auth/login       /auth/google/*   /auth/apple/*              │
│   /auth/strava/*    /activities/*    /aggregations/*            │
│   /feedback/*       /goals/*         /ai/*                      │
│                                                                 │
│   Middlewares: JWT auth · rate limit · Zod validation           │
└──────────┬────────────────────┬───────────────────────────────--┘
           │                    │
┌──────────▼──────────┐  ┌──────▼──────────────────────────────--┐
│   STRAVA SERVICE    │  │           DOMAIN SERVICES              │
│                     │  │                                        │
│  - OAuth 2.0 flow   │  │  ActivityService                       │
│  - Token refresh    │  │  AggregationService (CTL/ATL/TSB)      │
│  - Webhook handler  │  │  FeedbackService                       │
│  - Activity sync    │  │  GoalService                           │
└──────────┬──────────┘  └──────┬──────────────────────────────--┘
           │                    │
           │         aggregated context (~1000 tokens)
           │                    │
┌──────────▼────────────────────▼───────────────────────────────-┐
│                   AI ORCHESTRATION LAYER                        │
│                     LangGraph (TypeScript)                      │
│                                                                 │
│   ┌─────────────┐                                               │
│   │ loadContext │  ← builds LLM context from cache              │
│   └──────┬──────┘                                               │
│          ▼                                                       │
│   ┌─────────────┐                                               │
│   │   router    │  ← GPT-4o-mini, structured output             │
│   └──────┬──────┘                                               │
│          │                                                       │
│    ┌─────┼──────┐                                               │
│    ▼     ▼      ▼                                               │
│  coach  physio  mental   ← GPT-4o, structured output + tools    │
│    │     │      │                                               │
│    └─────┴──────┘                                               │
│          ▼                                                       │
│   ┌─────────────┐                                               │
│   │ synthesizer │  ← merges if multi-agents                     │
│   └─────────────┘                                               │
└───────────────────────────────┬───────────────────────────────-┘
                                │
┌───────────────────────────────▼───────────────────────────────-┐
│                        INFRASTRUCTURE                           │
│                                                                 │
│  PostgreSQL 16             Redis 7                              │
│  ─────────────             ───────                              │
│  activities                aggregate cache (TTL 1h)             │
│  weekly_aggregates         JWT sessions                         │
│  daily_feedbacks           BullMQ queues                        │
│  goals                                                          │
│  training_plans                                                 │
│  ai_recommendations                                             │
│  strava_tokens (encrypted)                                      │
└────────────────────────────────────────────────────────────────┘
```

---

## Main Data Flows

### 1. Strava Sync (real-time)

```
Strava webhook POST /strava/webhook
        │
        ▼
  HMAC signature verification
        │
        ▼
  BullMQ queue "strava-sync"
        │
        ▼
  Worker: fetch activity via Strava API
        │
        ▼
  Calculate TSS (duration × HR intensity)
        │
        ▼
  INSERT activities
        │
        ▼
  Recalculate ATL / CTL / TSB for the day
        │
        ▼
  Invalidate Redis cache ctx:{userId}
        │
        ▼
  (optional) Trigger post-session AI analysis
```

### 2. AI Call — User Chat

```
POST /ai/chat { message, threadId? }
        │
        ▼
  JWT middleware → userId
        │
        ▼
  Rate limit check (20 req/min/user)
        │
        ▼
  AggregationService.getContextWindow(userId)
  → Redis cache or rebuild from PostgreSQL
        │
        ▼
  LangGraph.invoke({ userId, message, context })
        │
        ├── loadContext node
        ├── router node      (GPT-4o-mini)
        ├── agent node(s)    (GPT-4o)
        └── synthesizer node
        │
        ▼
  Zod validation of structured output
        │
        ▼
  INSERT ai_recommendations
        │
        ▼
  Response 200 { type, data }
```

### 3. Training Plan Generation (SSE)

```
POST /ai/plan/generate
        │
        ▼
  Validate active goal + sufficient data (≥ 4 weeks)
        │
        ▼
  LangGraph.stream()
        │
        ▼
  SSE chunked: { step: "routing"|"generating"|"validating", data? }
        │
        ▼
  INSERT training_plans
        │
        ▼
  SSE final: { step: "done", planId }
```

---

## AI Layer — Details

### Separation of Concerns

```
domain/aggregation/     ← calculates metrics (CTL, ATL, TSB, monotony)
                            NO LLM, NO prompts
                            unit testable

ai/context/             ← transforms aggregates into structured text
                            limited to ~1000 tokens of data
                            adapts detail level based on intent

ai/agents/              ← LangGraph nodes
                            receive only pre-assembled context
                            return only Zod structured outputs

ai/graph/               ← graph topology, conditional edges
                            pure orchestration, no business logic
```

### LLM Token Management

```
Budget per call (target < 4000 tokens total):

  Fixed system prompt         : ~400 tokens
  Aggregated context (8 weeks): ~700 tokens
  Summarized history (3 exchanges): ~250 tokens
  User message                : ~150 tokens
  ─────────────────────────────────────────
  Total input                 : ~1500 tokens
  Max output (structured)     : ~800 tokens
  ─────────────────────────────────────────
  Total                       : ~2300 tokens / call
  Estimated cost (gpt-4o)     : ~$0.012 / call
```

---

## Infrastructure

### Docker Compose (development)

```yaml
services:
  postgres:
    image: postgres:16-alpine
    ports: ["5432:5432"]
    volumes: [pgdata:/var/lib/postgresql/data]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
```

### Cron Jobs (production)

| Job | Schedule | Action |
|-----|----------|--------|
| `recalc-aggregates` | `0 2 * * *` | Weekly/monthly recalculation |
| `weekly-report` | `0 7 * * 1` | Monday morning report |
| `refresh-strava-tokens` | `*/30 * * * *` | Refresh expiring tokens |

---

## Security

- **Identity providers**: Google, Apple, email/pwd — voir `specs/AUTH.md`
- **Strava**: intégration données uniquement (≠ provider d'identité)
- **Passwords**: bcrypt cost 12
- **Strava Tokens**: encrypted AES-256-GCM in database, key in environment variable
- **JWT**: HS256, 7 day expiry, `httpOnly` cookie, refresh via `/auth/refresh`
- **OAuth PKCE**: obligatoire pour Google et Apple (mitigation CSRF)
- **Strava Webhook**: verification `hub.verify_token` + HMAC signature on each event
- **Rate limiting**: 20 req/min on `/ai/*`, 100 req/min global per IP
- **Validation**: all API inputs validated by Zod before processing
- **LLM Injections**: user message is truncated to 500 chars and escaped before prompt injection
