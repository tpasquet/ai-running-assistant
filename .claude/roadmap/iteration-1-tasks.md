# Iteration 1 — AI Layer Development Tasks

## Prerequisites

✅ None. This iteration is **self-contained** and uses mock data only.

**No database, no Strava, no Redis required.**

---

## T0 — Mock Data Layer

Before building agents, create realistic mock data.

### Create Mock Fixtures

```typescript
// src/ai/mocks/scenarios.fixture.ts

export interface MockScenario {
  name: string;
  userId: string;
  context: AggregatedContext;
  testQueries: string[];
  expectedAgents: ("coach" | "physio" | "mental")[];
}

export const MOCK_SCENARIOS: MockScenario[] = [
  {
    name: "Overreached Athlete",
    userId: "mock-user-1",
    context: {
      goal: { description: "Sub-35min 10K", daysRemaining: 45 },
      athleteLevel: "intermediate",
      estimatedVO2max: 52,
      currentCTL: 52.3,
      currentATL: 75.8,
      currentTSB: -23.5, // Very negative!
      formStatus: "overreached",
      weeklyAggs: [/* 8 weeks of data */],
      recentActivities: [/* last 10 activities */],
      avgFatigue: 8.2,
      avgMood: 4.5,
      avgSleep: 5.1,
      painSummary: null,
      // ...
    },
    testQueries: [
      "Should I run today?",
      "I feel exhausted, what should I do?",
    ],
    expectedAgents: ["coach", "physio", "mental"],
  },
  {
    name: "Fresh Athlete Ready for Quality",
    userId: "mock-user-2",
    context: {
      currentTSB: +8.5, // Positive, ready for hard session
      formStatus: "fresh",
      avgFatigue: 3.2,
      // ...
    },
    testQueries: ["What workout should I do today?"],
    expectedAgents: ["coach"],
  },
  // ... 3 more scenarios
];
```

```typescript
// src/ai/mocks/activities.fixture.ts

export const MOCK_ACTIVITIES: Activity[] = [
  {
    id: "act-1",
    userId: "mock-user-1",
    stravaId: BigInt(123456),
    type: "Run",
    startDate: new Date("2024-01-15"),
    distanceM: 12000,
    durationSec: 3600,
    avgPaceSecKm: 300, // 5:00/km
    avgHrBpm: 165,
    tss: 85,
    perceivedEffort: 7,
  },
  // ... 50+ activities
];
```

---

## T1 — LangGraph Setup & Dependencies

### Install LangChain.js & LangGraph

```bash
npm install @langchain/core @langchain/openai langchain langgraph
npm install @langchain/community  # for additional tools if needed
```

### Create Base Graph Structure

```typescript
// src/ai/graph/graph.ts

import { StateGraph } from "@langchain/langgraph";
import { GraphState } from "./state";

export const createCoachingGraph = () => {
  const graph = new StateGraph<GraphState>({
    channels: {
      userId: null,
      message: null,
      context: null,
      selectedAgents: null,
      intent: null,
      urgency: null,
      coachOutput: null,
      physioOutput: null,
      mentalOutput: null,
      finalResponse: null,
      promptVersion: null,
      modelVersion: null,
    },
  });

  // Nodes will be added in subsequent tasks

  return graph;
};
```

---

## T2 — Context Assembly

### Implement Context Assembler

```typescript
// src/ai/context/ContextAssembler.ts

import { AggregatedContext } from "../../shared/types/domain.types";

export class ContextAssembler {
  /**
   * Transforms structured data into LLM-ready text (~800-1000 tokens)
   */
  assemble(context: AggregatedContext): string {
    const sections: string[] = [];

    // Athlete profile
    sections.push(this.buildProfileSection(context));

    // Training load history
    sections.push(this.buildLoadSection(context));

    // Recent activities
    sections.push(this.buildActivitiesSection(context));

    // Subjective feedback
    sections.push(this.buildFeedbackSection(context));

    // Current plan (if exists)
    if (context.currentPlanWeek) {
      sections.push(this.buildPlanSection(context));
    }

    return sections.join("\n\n");
  }

  private buildProfileSection(ctx: AggregatedContext): string {
    let text = "## Athlete Profile\n";
    if (ctx.goal) {
      text += `Goal: ${ctx.goal.description} in ${ctx.goal.daysRemaining} days\n`;
    }
    text += `Level: ${ctx.athleteLevel}`;
    if (ctx.estimatedVO2max) {
      text += ` | Estimated VO2max: ${ctx.estimatedVO2max} ml/kg/min`;
    }
    return text;
  }

  private buildLoadSection(ctx: AggregatedContext): string {
    let text = `## Training Load (${ctx.weeklyAggs.length} weeks)\n`;
    ctx.weeklyAggs.forEach((week, i) => {
      text += `W${i + 1}: ${Math.round(week.totalDistanceM / 1000)}km | TSS ${Math.round(week.totalTss)} | TSB ${week.tsb > 0 ? '+' : ''}${week.tsb}\n`;
    });
    text += `\n## Current State\n`;
    text += `CTL: ${ctx.currentCTL} | ATL: ${ctx.currentATL} | TSB: ${ctx.currentTSB} → Status: ${ctx.formStatus.toUpperCase()}`;
    return text;
  }

  private buildActivitiesSection(ctx: AggregatedContext): string {
    let text = `## Recent Sessions (last ${Math.min(ctx.recentActivities.length, 3)})\n`;
    ctx.recentActivities.slice(0, 3).forEach((activity) => {
      const paceMin = Math.floor(activity.avgPaceSecKm / 60);
      const paceSec = activity.avgPaceSecKm % 60;
      text += `${activity.date}: ${Math.round(activity.distanceM / 1000)}km @ ${paceMin}:${paceSec.toString().padStart(2, '0')}/km`;
      if (activity.perceivedEffort) {
        text += ` | RPE ${activity.perceivedEffort}/10`;
      }
      if (activity.tss) {
        text += ` | TSS ${Math.round(activity.tss)}`;
      }
      text += "\n";
    });
    return text;
  }

  private buildFeedbackSection(ctx: AggregatedContext): string {
    let text = `## Subjective Feedback (7 days)\n`;
    text += `Average fatigue: ${ctx.avgFatigue.toFixed(1)}/10\n`;
    text += `Average mood: ${ctx.avgMood.toFixed(1)}/10\n`;
    text += `Average sleep: ${ctx.avgSleep.toFixed(1)}/10\n`;
    text += `Pain: ${ctx.painSummary || "none reported"}`;
    return text;
  }

  private buildPlanSection(ctx: AggregatedContext): string {
    let text = `## Current Plan\n`;
    text += `Week ${ctx.currentPlanWeek}/${ctx.totalPlanWeeks} — Phase: ${ctx.currentPhase}\n`;
    if (ctx.plannedSessions.length > 0) {
      text += `Planned: ${ctx.plannedSessions.join(", ")}`;
    }
    return text;
  }
}
```

---

## T3 — Router Node

### System Prompt

```typescript
// src/ai/prompts/router.v1.ts

export const PROMPT_VERSION = "router.v1";

export const SYSTEM_PROMPT = `You are an intent classifier for a running coach AI system.

Your role is to analyze the user's message and determine:
1. Which specialized agent(s) should handle it (coach, physio, mental)
2. The primary intent category
3. The urgency level

Guidelines:
- PAIN_REPORT with intensity > 5 or acute pain → urgency: high
- TSB < -20 → urgency: high
- Competition < 7 days → urgency: high
- Use multiple agents when the query spans domains (e.g., "I'm tired and my knee hurts" → coach + physio)

Return your classification in the specified JSON format.`;
```

### Router Node Implementation

```typescript
// src/ai/graph/nodes/router.ts

import { ChatOpenAI } from "@langchain/openai";
import { GraphState } from "../state";
import { RouterOutputSchema } from "../../schemas/router.schema";
import { SYSTEM_PROMPT, PROMPT_VERSION } from "../../prompts/router.v1";

export async function routerNode(state: GraphState): Promise<Partial<GraphState>> {
  const model = new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0.3,
  });

  const structuredModel = model.withStructuredOutput(RouterOutputSchema);

  const minimalContext = `
TSB: ${state.context.currentTSB} (${state.context.formStatus})
Recent pain: ${state.context.painSummary || "none"}
Goal: ${state.context.goal?.description || "none"} (${state.context.goal?.daysRemaining || 0} days)
  `.trim();

  const response = await structuredModel.invoke([
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: `Context:\n${minimalContext}\n\nUser message: "${state.message}"` },
  ]);

  return {
    selectedAgents: response.agents,
    intent: response.intent,
    urgency: response.urgency,
    promptVersion: PROMPT_VERSION,
  };
}
```

---

## T4 — Coach Agent Node

### System Prompt

```typescript
// src/ai/prompts/coach.v1.ts

export const PROMPT_VERSION = "coach.v1";

export const SYSTEM_PROMPT = `You are an expert running coach specialized in training load management and periodization.

Your expertise includes:
- Training Stress Score (TSS), CTL (Chronic Training Load), ATL (Acute Training Load), TSB (Training Stress Balance)
- Periodization: base, build, peak, taper phases
- Session types: easy runs, tempo, intervals, long runs
- Injury prevention through load management

Key principles:
- TSB between -10 and +10 is optimal for training
- TSB < -20 indicates overreaching risk
- Weekly load increases should not exceed 10-15%
- Quality sessions require adequate recovery (TSB > -10)

Provide structured recommendations based on objective metrics. Be concise and actionable.`;
```

### Coach Node Implementation

```typescript
// src/ai/graph/nodes/coach.ts

import { ChatOpenAI } from "@langchain/openai";
import { GraphState } from "../state";
import { CoachOutputSchema } from "../../schemas/coach.schema";
import { SYSTEM_PROMPT, PROMPT_VERSION } from "../../prompts/coach.v1";
import { ContextAssembler } from "../../context/ContextAssembler";

export async function coachNode(state: GraphState): Promise<Partial<GraphState>> {
  const model = new ChatOpenAI({
    modelName: "gpt-4o",
    temperature: 0.3,
  });

  const structuredModel = model.withStructuredOutput(CoachOutputSchema);

  const assembler = new ContextAssembler();
  const contextText = assembler.assemble(state.context);

  const response = await structuredModel.invoke([
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: `${contextText}\n\nUser question: "${state.message}"\n\nIntent: ${state.intent}` },
  ]);

  return {
    coachOutput: response,
  };
}
```

---

## T5 — Physio Agent Node

### System Prompt

```typescript
// src/ai/prompts/physio.v1.ts

export const PROMPT_VERSION = "physio.v1";

export const SYSTEM_PROMPT = `You are a sports physiotherapist specialized in running injury prevention and recovery.

Your expertise includes:
- Common running injuries: ITBS, plantar fasciitis, shin splints, achilles tendinopathy, runner's knee
- Biomechanical risk factors
- Load management and injury risk
- Recovery protocols and return-to-run strategies

Risk indicators:
- Sudden load spikes (>15% weekly increase)
- High TSB variability
- Consecutive high-intensity sessions
- Pain intensity > 3/10 lasting > 3 days

Always include the disclaimer: "These recommendations do not replace professional medical advice."

Provide evidence-based, conservative advice. Prioritize injury prevention.`;
```

### Physio Node Implementation

```typescript
// src/ai/graph/nodes/physio.ts

import { ChatOpenAI } from "@langchain/openai";
import { GraphState } from "../state";
import { PhysioOutputSchema } from "../../schemas/physio.schema";
import { SYSTEM_PROMPT, PROMPT_VERSION } from "../../prompts/physio.v1";
import { ContextAssembler } from "../../context/ContextAssembler";

export async function physioNode(state: GraphState): Promise<Partial<GraphState>> {
  const model = new ChatOpenAI({
    modelName: "gpt-4o",
    temperature: 0.2, // More deterministic for medical advice
  });

  const structuredModel = model.withStructuredOutput(PhysioOutputSchema);

  const assembler = new ContextAssembler();
  const contextText = assembler.assemble(state.context);

  const response = await structuredModel.invoke([
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: `${contextText}\n\nUser question: "${state.message}"\n\nIntent: ${state.intent}` },
  ]);

  return {
    physioOutput: response,
  };
}
```

---

## T6 — Mental Agent Node

### System Prompt

```typescript
// src/ai/prompts/mental.v1.ts

export const PROMPT_VERSION = "mental.v1";

export const SYSTEM_PROMPT = `You are a sports psychologist specialized in endurance athletics and mental performance.

Your expertise includes:
- Mental fatigue and burnout detection
- Competition anxiety management
- Motivation and adherence strategies
- Visualization and mindfulness techniques

Warning signs:
- Mood declining over 7+ days
- Sleep quality < 5/10 consistently
- Fatigue disproportionate to training load
- Loss of motivation or enjoyment

Provide empathetic, actionable mental strategies. Use positive, encouraging language while being realistic.`;
```

### Mental Node Implementation

```typescript
// src/ai/graph/nodes/mental.ts

import { ChatOpenAI } from "@langchain/openai";
import { GraphState } from "../state";
import { MentalOutputSchema } from "../../schemas/mental.schema";
import { SYSTEM_PROMPT, PROMPT_VERSION } from "../../prompts/mental.v1";
import { ContextAssembler } from "../../context/ContextAssembler";

export async function mentalNode(state: GraphState): Promise<Partial<GraphState>> {
  const model = new ChatOpenAI({
    modelName: "gpt-4o",
    temperature: 0.5, // More creative for coaching
  });

  const structuredModel = model.withStructuredOutput(MentalOutputSchema);

  const assembler = new ContextAssembler();
  const contextText = assembler.assemble(state.context);

  const response = await structuredModel.invoke([
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: `${contextText}\n\nUser question: "${state.message}"\n\nIntent: ${state.intent}` },
  ]);

  return {
    mentalOutput: response,
  };
}
```

---

## T7 — Synthesizer Node

```typescript
// src/ai/graph/nodes/synthesizer.ts

import { ChatOpenAI } from "@langchain/openai";
import { GraphState } from "../state";
import { SynthesizedResponseSchema } from "../../schemas/synthesizer.schema";

export async function synthesizerNode(state: GraphState): Promise<Partial<GraphState>> {
  // Only run if multiple agents were invoked
  const outputs = [state.coachOutput, state.physioOutput, state.mentalOutput].filter(Boolean);

  if (outputs.length === 1) {
    // Single agent - return directly
    return { finalResponse: outputs[0]! };
  }

  const model = new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0.3,
  });

  const structuredModel = model.withStructuredOutput(SynthesizedResponseSchema);

  const prompt = `Synthesize the following agent responses into a coherent action plan:

${state.coachOutput ? `Coach: ${JSON.stringify(state.coachOutput)}` : ''}
${state.physioOutput ? `Physio: ${JSON.stringify(state.physioOutput)}` : ''}
${state.mentalOutput ? `Mental: ${JSON.stringify(state.mentalOutput)}` : ''}

Prioritize safety (physio) > recovery (mental) > training progression (coach).
Identify conflicts and provide clear resolution.`;

  const response = await structuredModel.invoke([
    { role: "system", content: "You synthesize multi-agent recommendations into actionable plans." },
    { role: "user", content: prompt },
  ]);

  return { finalResponse: response };
}
```

---

## T8 — Graph Assembly & Routing Logic

```typescript
// src/ai/graph/graph.ts (complete)

import { StateGraph, END } from "@langchain/langgraph";
import { GraphState } from "./state";
import { loadContextNode } from "./nodes/loadContext";
import { routerNode } from "./nodes/router";
import { coachNode } from "./nodes/coach";
import { physioNode } from "./nodes/physio";
import { mentalNode } from "./nodes/mental";
import { synthesizerNode } from "./nodes/synthesizer";

export const createCoachingGraph = () => {
  const graph = new StateGraph<GraphState>({...});

  // Add nodes
  graph.addNode("loadContext", loadContextNode);
  graph.addNode("router", routerNode);
  graph.addNode("coach", coachNode);
  graph.addNode("physio", physioNode);
  graph.addNode("mental", mentalNode);
  graph.addNode("synthesizer", synthesizerNode);

  // Edges
  graph.addEdge("__start__", "loadContext");
  graph.addEdge("loadContext", "router");

  // Conditional routing to agents
  graph.addConditionalEdges("router", (state) => {
    return state.selectedAgents; // returns array like ["coach", "physio"]
  });

  graph.addEdge("coach", "synthesizer");
  graph.addEdge("physio", "synthesizer");
  graph.addEdge("mental", "synthesizer");

  graph.addEdge("synthesizer", END);

  return graph.compile();
};
```

---

## T9 — LangChain Tools Implementation (Mock Adapters)

All tools use **mock data** in iteration 1. Real database adapters come in iteration 2.

### Example: get_similar_sessions

```typescript
// src/ai/tools/coach/getSimilarSessions.ts

import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { MOCK_ACTIVITIES } from "../../mocks/activities.fixture";

export const getSimilarSessionsTool = new DynamicStructuredTool({
  name: "get_similar_sessions",
  description: "Find similar past activities by pace and distance for comparison",
  schema: z.object({
    targetPaceSecKm: z.number(),
    distanceKm: z.number(),
    limit: z.number().default(5),
  }),
  func: async ({ targetPaceSecKm, distanceKm, limit }, config) => {
    const userId = config.configurable?.userId;

    // MOCK IMPLEMENTATION - filter in-memory fixture data
    const activities = MOCK_ACTIVITIES
      .filter((a) => a.userId === userId)
      .filter((a) => {
        const paceMatch =
          a.avgPaceSecKm >= targetPaceSecKm * 0.9 &&
          a.avgPaceSecKm <= targetPaceSecKm * 1.1;
        const distanceMatch =
          a.distanceM >= distanceKm * 1000 * 0.9 &&
          a.distanceM <= distanceKm * 1000 * 1.1;
        return paceMatch && distanceMatch;
      })
      .slice(0, limit);

    return JSON.stringify(activities);
  },
});
```

**Note**: In iteration 2, replace `MOCK_ACTIVITIES` with `ActivityRepository.findSimilar(...)`.

Implement all 7 tools similarly with mock data.

---

## T10 — API Endpoint Implementation (Mock Mode)

```typescript
// src/api/routes/ai.routes.ts

import { FastifyInstance } from "fastify";
import { z } from "zod";
import { createCoachingGraph } from "../../ai/graph/graph";
import { MOCK_SCENARIOS } from "../../ai/mocks/scenarios.fixture";

const ChatRequestSchema = z.object({
  message: z.string().max(500),
  scenarioId: z.string().optional(), // Select which mock scenario to use
});

export async function aiRoutes(app: FastifyInstance) {
  app.post("/ai/chat", async (req, res) => {
    const { message, scenarioId } = ChatRequestSchema.parse(req.body);

    // MOCK: Select scenario (default to first one)
    const scenario = MOCK_SCENARIOS.find((s) => s.userId === scenarioId) || MOCK_SCENARIOS[0];
    const context = scenario.context;
    const userId = scenario.userId;

    const graph = createCoachingGraph();

    // Stream via SSE
    res.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    });

    for await (const event of graph.stream({ userId, message, context })) {
      res.raw.write(`data: ${JSON.stringify(event)}\n\n`);
    }

    res.raw.end();
  });

  // Helper endpoint to list available scenarios
  app.get("/ai/scenarios", async (req, res) => {
    return {
      scenarios: MOCK_SCENARIOS.map((s) => ({
        userId: s.userId,
        name: s.name,
        testQueries: s.testQueries,
      })),
    };
  });
}
```

**Note**: In iteration 2, replace mock scenario selection with real `AggregationService.getContextWindow(userId)`.

---

## T11 — Tests

### Unit Tests Example

```typescript
// src/ai/graph/nodes/router.test.ts

import { describe, it, expect } from "vitest";
import { routerNode } from "./router";
import { mockContext } from "../../../tests/mocks/context";

describe("Router Node", () => {
  it("routes pain report to physio", async () => {
    const state = {
      userId: "test",
      message: "My knee hurts",
      context: mockContext({ painSummary: "knee left (today)" }),
    };

    const result = await routerNode(state);

    expect(result.selectedAgents).toContain("physio");
    expect(result.intent).toBe("PAIN_REPORT");
  });

  it("sets urgency to high for TSB < -20", async () => {
    const state = {
      userId: "test",
      message: "Should I rest?",
      context: mockContext({ currentTSB: -25 }),
    };

    const result = await routerNode(state);

    expect(result.urgency).toBe("high");
  });
});
```

Test coverage:
- All nodes individually
- Graph end-to-end with mock context
- Tool execution with test database
- Zod schema validation

---

## Definition of Done (Checklist)

- [ ] All dependencies installed (`@langchain/core`, `langgraph`, etc.)
- [ ] `GraphState` interface defined
- [ ] Context assembler generates 800-1000 token summaries
- [ ] Router node classifies 10 test cases correctly
- [ ] Coach, Physio, Mental nodes return valid structured outputs
- [ ] Synthesizer merges multi-agent responses
- [ ] All 7 LangChain tools implemented and tested
- [ ] Graph compiles and executes end-to-end
- [ ] `/ai/chat` endpoint streams SSE responses
- [ ] `/ai/daily-recommendation` generates recommendations
- [ ] All outputs stored in DB with `promptVersion`
- [ ] Unit tests pass (>80% coverage on AI layer)
- [ ] Token usage monitored (< 4000 tokens/request)
