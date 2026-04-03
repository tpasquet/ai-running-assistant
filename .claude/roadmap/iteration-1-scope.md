# Iteration 1 — AI Multi-Agent Layer

## Objective

Build a functional AI orchestration layer using LangGraph and LangChain.js capable of:

1. Routing user queries to specialized agents (Coach, Physio, Mental)
2. Executing agent logic with structured outputs (Zod validation)
3. Synthesizing multi-agent responses
4. Using LangChain tools with **mock data** (no real backend needed)
5. Generating daily recommendations and session analyses

**Prerequisites**: None. This iteration uses mock/fixture data to focus on AI logic only.

---

## Functional Scope

### In scope ✅

- LangGraph graph definition (nodes, edges, state)
- Router node (GPT-4o-mini) with intent classification
- Three specialized agents:
  - Coach Agent (training load, plans, recommendations)
  - Physio Agent (injury risk, recovery protocols)
  - Mental Agent (motivation, stress management)
- Synthesizer node (multi-agent response merging)
- LangChain tools implementation (with **mock data adapters**):
  - `get_similar_sessions`
  - `get_previous_recommendations`
  - `get_current_plan`
  - `get_pain_history`
  - `get_load_spike_analysis`
  - `get_mood_history`
  - `get_competition_calendar`
- Context assembly (from mock fixtures → LLM-ready text)
- Mock data layer (`src/ai/mocks/`) with realistic training scenarios
- Structured output schemas (Zod) for all agents
- System prompts (versioned in `src/ai/prompts/`)
- Chat endpoint `/ai/chat` with streaming support (SSE)
- Daily recommendation generation

### Out of scope ❌

- Real backend API / database (iteration 2)
- Strava OAuth and data sync (iteration 2)
- PostgreSQL / Prisma setup (iteration 2)
- Training plan generation endpoint (iteration 3)
- Conversation history/memory (iteration 3)
- Multi-turn refinement (iteration 3)
- User feedback on recommendations
- Frontend integration

---

## AI Architecture

```
User message
     │
     ▼
┌─────────────────────────────────────────────────────┐
│  LOAD CONTEXT NODE                                  │
│  - Fetch from AggregationService.getContextWindow() │
│  - Format to ~1000 tokens semantic text             │
└───────────────────┬─────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│  ROUTER NODE (GPT-4o-mini)                          │
│  Input:  message + minimal context (TSB, pain)      │
│  Output: { agents[], intent, urgency }              │
└───────────────────┬─────────────────────────────────┘
                    │
         ┌──────────┼──────────┐
         │          │          │
         ▼          ▼          ▼
    ┌─────────┐ ┌───────┐ ┌────────┐
    │  COACH  │ │ PHYSIO│ │ MENTAL │
    │ (GPT-4o)│ │(GPT-4o)│ │(GPT-4o)│
    └────┬────┘ └───┬───┘ └───┬────┘
         │          │          │
         └──────────┴──────────┘
                    │
                    ▼
           ┌──────────────┐
           │ SYNTHESIZER  │   (only if multi-agent)
           │  (GPT-4o-mini)│
           └──────────────┘
```

---

## GraphState Definition

```typescript
interface GraphState {
  // Input
  userId: string;
  message: string;
  threadId?: string;

  // Context
  context: AggregatedContext;

  // Router output
  selectedAgents: ("coach" | "physio" | "mental")[];
  intent: Intent;
  urgency: "low" | "normal" | "high";

  // Agent outputs
  coachOutput?: CoachOutput;
  physioOutput?: PhysioOutput;
  mentalOutput?: MentalOutput;

  // Final response
  finalResponse: AgentResponse;

  // Metadata
  promptVersion: string;
  modelVersion: string;
}
```

---

## Agent Outputs (Structured)

### Router

```typescript
const RouterOutputSchema = z.object({
  agents: z.array(z.enum(["coach", "physio", "mental"])).min(1).max(3),
  intent: z.enum([
    "TRAINING_PLAN",
    "SESSION_ANALYSIS",
    "PAIN_REPORT",
    "FATIGUE_QUESTION",
    "MOTIVATION",
    "COMPETITION_STRESS",
    "RECOVERY_ADVICE",
    "GENERAL_QUESTION",
  ]),
  urgency: z.enum(["low", "normal", "high"]),
  reasoning: z.string().max(100),
});
```

### Coach Agent

```typescript
// Union of possible outputs
type CoachOutput =
  | DailyRecommendation
  | SessionAnalysis
  | GeneralAnswer;

const DailyRecommendationSchema = z.object({
  type: z.literal("DAILY_RECOMMENDATION"),
  recommendedActivity: z.object({
    kind: z.enum(["rest", "easy_run", "moderate_run", "quality_session", "cross_training"]),
    durationMin: z.number().optional(),
    targetPaceRange: z.object({
      minSecKm: z.number(),
      maxSecKm: z.number(),
    }).optional(),
    description: z.string().max(120),
  }),
  rationale: z.string().max(250),
  warningFlags: z.array(z.enum([
    "tsb_very_negative",
    "overreaching_risk",
    "competition_soon",
    "pain_reported",
    "consecutive_hard_days",
  ])),
});

const SessionAnalysisSchema = z.object({
  type: z.literal("SESSION_ANALYSIS"),
  summary: z.string().max(200),
  effortAssessment: z.enum(["too_easy", "appropriate", "too_hard", "overreaching"]),
  keyMetrics: z.object({
    tss: z.number(),
    comparedToAvg: z.enum(["below", "normal", "above"]),
  }),
  nextSessionRecommendation: z.object({
    kind: z.enum(["rest", "easy", "moderate", "quality"]),
    rationale: z.string().max(150),
    suggestedPaceSecKm: z.number().optional(),
  }),
});
```

### Physio Agent

```typescript
const InjuryRiskSchema = z.object({
  type: z.literal("INJURY_RISK"),
  riskLevel: z.enum(["none", "low", "moderate", "high"]),
  affectedAreas: z.array(z.object({
    location: z.string(),
    hypothesis: z.string().max(150),
    confidence: z.enum(["low", "medium", "high"]),
  })),
  recoveryProtocol: z.object({
    restDaysRecommended: z.number().min(0).max(14),
    exercises: z.array(z.object({
      name: z.string(),
      setsReps: z.string(),
      frequency: z.string(),
    })).max(5),
    loadReductionPercent: z.number().min(0).max(100).optional(),
  }),
  requiresProfessional: z.boolean(),
  disclaimer: z.literal("These recommendations do not replace professional medical advice."),
});
```

### Mental Agent

```typescript
const MentalInsightSchema = z.object({
  type: z.literal("MENTAL_INSIGHT"),
  mentalStateAssessment: z.enum(["positive", "neutral", "fatigued", "anxious", "demotivated"]),
  keyObservations: z.array(z.string().max(100)).max(3),
  techniques: z.array(z.object({
    name: z.string(),
    description: z.string().max(200),
    when: z.string().max(80),
  })).max(3),
  affirmation: z.string().max(120),
  flagForCoach: z.boolean(),
});
```

### Synthesizer

```typescript
const SynthesizedResponseSchema = z.object({
  type: z.literal("SYNTHESIZED"),
  primaryAgent: z.enum(["coach", "physio", "mental"]),
  summary: z.string().max(300),
  actions: z.array(z.object({
    priority: z.number().min(1).max(3),
    source: z.enum(["coach", "physio", "mental"]),
    action: z.string().max(150),
  })).max(5),
  conflicts: z.array(z.string()).optional(),
  resolution: z.string().max(200).optional(),
});
```

---

## LangChain Tools

All tools use **mock data adapters** in iteration 1. Real database integration happens in iteration 2.

### Coach Tools

**`get_similar_sessions`**
```typescript
// Finds similar activities by pace/distance/type for comparison
// Data source: src/ai/mocks/activities.fixture.ts
input: { targetPaceSecKm: number; distanceKm: number; limit: number }
output: ActivitySummary[]
```

**`get_previous_recommendations`**
```typescript
// Last N recommendations to ensure consistency
input: { days: number; limit: number }
output: AIRecommendation[]
```

**`get_current_plan`**
```typescript
// Active training plan if exists
input: {}
output: TrainingPlan | null
```

### Physio Tools

**`get_pain_history`**
```typescript
// Complete pain location history
input: { days: number }
output: Array<{ date: string; location: string; intensity: number }>
```

**`get_load_spike_analysis`**
```typescript
// Detects abnormal load spikes (injury risk)
input: { weeks: number }
output: { spikes: Array<{ week: string; increase: number; risk: string }> }
```

### Mental Tools

**`get_mood_history`**
```typescript
// Mood/sleep trends
input: { days: number }
output: { mood: number[]; sleep: number[]; trend: "up" | "down" | "stable" }
```

**`get_competition_calendar`**
```typescript
// Upcoming goals/races
input: {}
output: Goal[]
```

---

## API Endpoints

### `POST /ai/chat`

Chat with the AI coaching system.

**Body:**
```typescript
{
  message: string;        // max 500 chars
  threadId?: string;      // for future conversation history
}
```

**Response (SSE):**
```typescript
// Streamed events:
data: {"step":"loading_context"}
data: {"step":"routing","intent":"FATIGUE_QUESTION"}
data: {"step":"executing","agents":["coach","physio"]}
data: {"step":"done","response":{...}}
```

### `POST /ai/daily-recommendation`

Generate daily training recommendation.

**Body:**
```typescript
{
  date?: string;  // defaults to today
}
```

**Response:**
```typescript
{
  type: "DAILY_RECOMMENDATION",
  recommendedActivity: {...},
  rationale: string,
  warningFlags: string[]
}
```

---

## Context Assembly

The `ai/context/ContextAssembler.ts` transforms `AggregatedContext` → LLM prompt text.

**Example output (~800 tokens):**

```
## Athlete Profile
Goal: Sub-35min 10K in 45 days
Level: intermediate | Estimated VO2max: 52 ml/kg/min

## Training Load (8 weeks)
W1: 32km | TSS 185 | TSB +4
W2: 38km | TSS 220 | TSB -2
W3: 35km | TSS 205 | TSB +1
...
W8: 42km | TSS 250 | TSB -8 → Status: FATIGUED

## Current State
CTL: 52.3 | ATL: 61.1 | TSB: -8.8 → Status: FATIGUED

## Recent Sessions (last 3)
2024-01-15: 12km @ 5:02/km | RPE 7/10 | TSS 85
2024-01-13: 8km @ 5:45/km | RPE 5/10 | TSS 45
2024-01-11: 16km @ 5:20/km | RPE 6/10 | TSS 98

## Subjective Feedback (7 days)
Average fatigue: 6.8/10
Average mood: 7.2/10
Average sleep: 6.5/10
Pain: none reported

## Current Plan
Week 6/10 — Phase: specific
Planned: tempo 6km, recovery 8km, long run 18km
```

---

## Prompt Versioning

Prompts stored in `src/ai/prompts/`:

```
src/ai/prompts/
├── router.v1.ts
├── coach.v1.ts
├── physio.v1.ts
├── mental.v1.ts
└── synthesizer.v1.ts
```

Each exports:
```typescript
export const PROMPT_VERSION = "coach.v1";
export const SYSTEM_PROMPT = `You are an expert running coach...`;
```

---

## Definition of Done

- [ ] LangGraph graph compiles and executes without errors
- [ ] Router correctly classifies 10 test intents
- [ ] All 3 agents return valid structured outputs (Zod validation passes)
- [ ] Synthesizer merges multi-agent responses coherently
- [ ] All 7 LangChain tools execute successfully with **mock data**
- [ ] Mock data fixtures cover 5+ realistic training scenarios
- [ ] Context assembly generates ~800-1000 token summaries from mocks
- [ ] `POST /ai/chat` returns correct agent response via SSE
- [ ] `POST /ai/daily-recommendation` generates valid recommendation
- [ ] Agent outputs validated by Zod schemas (no database persistence yet)
- [ ] Unit tests for each node pass (`npm test`)
- [ ] Integration test: end-to-end flow from user message to final response
- [ ] Token usage < 4000 tokens per chat request (monitored)
- [ ] All code works **without** PostgreSQL/Redis running

---

## Mock Data Requirements

Create realistic fixtures in `src/ai/mocks/`:

- `athlete.fixture.ts` - 3 athlete profiles (beginner, intermediate, advanced)
- `activities.fixture.ts` - 50+ activities spanning 12 weeks
- `aggregates.fixture.ts` - Weekly aggregates with CTL/ATL/TSB variations
- `feedback.fixture.ts` - Daily feedback with pain/fatigue/mood data
- `goals.fixture.ts` - 5 goal examples (5K, 10K, half-marathon, etc.)
- `scenarios.fixture.ts` - Complete contexts for testing
  - Scenario 1: Overreached athlete (TSB -25)
  - Scenario 2: Fresh athlete ready for quality session
  - Scenario 3: Athlete with knee pain
  - Scenario 4: Pre-competition taper
  - Scenario 5: Motivation issues / burnout

---

## What Iteration 2 Provides

Iteration 2 (Strava + Backend) will replace mocks with:

- Real Strava OAuth and activity sync
- PostgreSQL database with Prisma
- Redis caching for context
- Repository pattern for data access
- Real BullMQ workers for async processing
- Migration of mock adapters → database adapters
