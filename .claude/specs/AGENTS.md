# AI Agents

## Multi-Agent System Overview

```
User message
     │
     ▼
┌─────────────────────────────────────────────────────┐
│  ROUTER (GPT-4o-mini)                               │
│                                                     │
│  Input  : message + minimal context (TSB, pain)    │
│  Output : { agents[], intent, urgency }             │
└───────────────────┬─────────────────────────────────┘
                    │
         ┌──────────┼──────────┐
         │          │          │
         ▼          ▼          ▼
    ┌─────────┐ ┌────────┐ ┌────────┐
    │  COACH  │ │ PHYSIO │ │ MENTAL │
    └────┬────┘ └───┬────┘ └───┬────┘
         │          │           │
         └──────────┴───────────┘
                    │
                    ▼
           ┌──────────────┐
           │ SYNTHESIZER  │   (only if multi-agents)
           └──────────────┘
```

---

## Router

### Role
Classify user intent and decide which agents to invoke. Generates **no content** visible to the user.

### Model
`gpt-4o-mini` — sufficient for classification, 10× cheaper than gpt-4o.

### Input (minimal context injected)
```
Current TSB: -8.2 (fatigued)
Recent pain reported: left knee (2 days ago)
Goal: sub 35 at 10km in 45 days
Message: "my knee has been hurting since yesterday and I feel exhausted"
```

### Output Schema (Zod)
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
  // "high" = acute pain, TSB < -20, competition in < 7 days
  reasoning: z.string().max(100), // for logging only
});
```

### Routing Rules

| Intent | Agents Invoked |
|--------|----------------|
| `TRAINING_PLAN` | `["coach"]` |
| `SESSION_ANALYSIS` | `["coach"]` |
| `PAIN_REPORT` | `["physio"]` or `["physio", "coach"]` if plan impact |
| `FATIGUE_QUESTION` | `["coach", "physio"]` |
| `MOTIVATION` | `["mental"]` |
| `COMPETITION_STRESS` | `["mental", "coach"]` |
| `RECOVERY_ADVICE` | `["physio", "coach"]` |
| `GENERAL_QUESTION` | `["coach"]` |

---

## Sports Coach Agent

### Role
Analyze training load, generate plans, provide daily recommendations based on CTL/ATL/TSB metrics.

### Model
`gpt-4o` — temperature `0.3`

### Context Injected
```
## Profile
Goal: sub 35 at 10km (D-45)
Estimated level: intermediate | Estimated VO2max: 52 ml/kg/min

## 8-week Load
W1: 32km | TSS 185 | TSB +4
W2: 38km | TSS 220 | TSB -2
...

## Current State
CTL: 52.3 | ATL: 61.1 | TSB: -8.8 → status: fatigued

## Last 3 Sessions
2024-01-15: 12km @ 5:02/km | RPE 7/10
2024-01-13: 8km @ 5:45/km | RPE 5/10
2024-01-11: 16km @ 5:20/km | RPE 6/10

## Feedback (7d)
Avg fatigue: 6.8/10 | Pain: none
Mood: 7.2/10 | Sleep: 6.5/10

## Current Plan
Week 6/10 — Phase: specific
Planned sessions: 6km tempo, 8km recovery, 18km long run
```

### Possible Outputs (discriminated union)

```typescript
// Daily recommendation
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
    "tsb_very_negative",    // TSB < -20
    "overreaching_risk",
    "competition_soon",
    "pain_reported",
    "consecutive_hard_days",
  ])),
});

// Session analysis
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
  weeklyLoadStatus: z.object({
    tsb: z.number(),
    status: z.enum(["fresh", "optimal", "tired", "overreached"]),
  }),
});

// Training plan
const TrainingPlanSchema = z.object({
  type: z.literal("TRAINING_PLAN"),
  goalSummary: z.string().max(100),
  totalWeeks: z.number(),
  phases: z.array(z.object({
    name: z.enum(["base", "build", "peak", "taper"]),
    weekNumbers: z.array(z.number()),
    weeklyDistanceKm: z.object({ min: z.number(), max: z.number() }),
    focusSessions: z.array(z.string()),
  })),
  weeks: z.array(z.object({
    weekNumber: z.number(),
    phase: z.string(),
    targetDistanceKm: z.number(),
    sessions: z.array(z.object({
      day: z.enum(["mon","tue","wed","thu","fri","sat","sun"]),
      type: z.enum(["easy","tempo","interval","long","rest","cross"]),
      durationMin: z.number(),
      description: z.string().max(150),
      targetPaceSecKm: z.number().optional(),
    })),
  })),
  warnings: z.array(z.string()),
});
```

### Accessible Tools
- `get_similar_sessions` — similar sessions for comparison
- `get_previous_recommendations` — recommendations from last 7 days (consistency)
- `get_current_plan` — current plan if exists

---

## Sports Physio Agent

### Role
Analyze injury and recovery signals, cross-reference with training load, propose prevention protocols.

### Model
`gpt-4o` — temperature `0.2` (more deterministic for medical advice)

### Context Injected
```
## Pain Feedback (last 30 days)
2024-01-15: left knee (intensity 4/10)
2024-01-13: none
2024-01-10: right calf (intensity 2/10) — gone next day
...

## Recent Load
TSB: -8.8 | ATL: 61.1 (high acute load)
Last week: 42km (↑18% vs 4-week avg)

## Injury History (if provided)
- Right plantar fasciitis (2023-06) — healed

## Recent Terrain Type
Road 70%, trail 30%
```

### Output Schema

```typescript
const InjuryRiskSchema = z.object({
  type: z.literal("INJURY_RISK"),
  riskLevel: z.enum(["none", "low", "moderate", "high"]),
  affectedAreas: z.array(z.object({
    location: z.string(),           // e.g., "left knee"
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
    returnToRunProtocol: z.string().max(200).optional(),
  }),
  requiresProfessional: z.boolean(), // true if serious symptoms
  disclaimer: z.literal("These recommendations do not replace professional medical advice."),
});
```

### Accessible Tools
- `get_pain_history` — complete pain history
- `get_load_spike_analysis` — abnormal load spike detection

---

## Mental Coach Agent

### Role
Analyze subjective feedback (mood, stress, motivation, sleep), detect negative patterns, provide mental tools.

### Model
`gpt-4o` — temperature `0.5` (more creative for coaching)

### Context Injected
```
## Mood & Well-being (last 14 days)
Mood: [7, 6, 5, 7, 8, 6, 4, 5, 6, 7, 5, 4, 6, 5] — declining trend
Sleep: [7, 6, 6, 7, 5, 6, 5, 5, 6, 7, 5, 5, 6, 5] — average

## Goal & Timing
Competition in 45 days
Declared confidence level: not provided

## Recent Free Notes
"I feel exhausted before even starting"
"Having trouble motivating myself"
```

### Output Schema

```typescript
const MentalInsightSchema = z.object({
  type: z.literal("MENTAL_INSIGHT"),
  mentalStateAssessment: z.enum(["positive", "neutral", "fatigued", "anxious", "demotivated"]),
  keyObservations: z.array(z.string().max(100)).max(3),
  techniques: z.array(z.object({
    name: z.string(),
    description: z.string().max(200),
    when: z.string().max(80), // "before session", "evening before competition"
  })).max(3),
  affirmation: z.string().max(120), // short personalized phrase
  flagForCoach: z.boolean(), // true if possible burnout → router notifies coach
});
```

### Accessible Tools
- `get_mood_history` — mood/sleep history
- `get_competition_calendar` — upcoming deadlines

---

## Synthesizer

### Role
Merge outputs from multiple agents into a coherent response. Invoked **only** if `agents.length > 1`.

### Operation
The synthesizer is a LangGraph node that:
1. Receives all `agentOutputs` in the state
2. Calls GPT-4o-mini with serialized outputs
3. Returns a structured `SynthesizedResponse`

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
  // e.g., "Coach recommends tempo session, physio recommends rest"
  resolution: z.string().max(200).optional(),
});
```

---

## Prompt Versioning

System prompts are stored in `src/ai/prompts/` and versioned:

```
src/ai/prompts/
├── router.v1.ts
├── coach.v1.ts
├── physio.v1.ts
├── mental.v1.ts
└── synthesizer.v1.ts
```

Each prompt exports a `SYSTEM_PROMPT` constant and a `PROMPT_VERSION` constant.
The version is stored in `ai_recommendations.promptVersion` for traceability.
