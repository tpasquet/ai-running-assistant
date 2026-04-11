import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { compileCoachingGraph } from "../../ai/graph/graph.js";
import { createInitialState } from "../../ai/graph/state.js";
import { ALL_SCENARIOS, getScenarioById } from "../../ai/mocks/scenarios.fixture.js";
import { AggregationService } from "../../domain/aggregation/AggregationService.js";
import { prisma } from "../../infra/db/prisma.js";
import { redis } from "../../infra/cache/redis.js";

const ChatRequestSchema = z.object({
  message: z.string().min(1).max(500),
});

const DemoRequestSchema = z.object({
  message: z.string().min(1).max(500),
  scenarioId: z.string().optional(),
});

export async function aiRoutes(app: FastifyInstance) {
  const aggregationService = new AggregationService(prisma, redis);

  /**
   * POST /api/ai/chat
   * Main chat endpoint — requires auth, uses real user context from DB.
   */
  app.post(
    "/api/ai/chat",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const result = ChatRequestSchema.safeParse(req.body);
      if (!result.success) {
        return reply.status(400).send({ error: result.error.issues[0]?.message });
      }

      const userId = req.user.sub;
      const context = await aggregationService.getContextWindow(userId);
      const graph = compileCoachingGraph();
      const initialState = createInitialState(userId, result.data.message, context);

      const output = await graph.invoke(initialState, {
        configurable: { userId },
      });

      return reply.send({
        message: result.data.message,
        intent: output.intent,
        urgency: output.urgency,
        selectedAgents: output.selectedAgents,
        response: output.finalResponse,
        promptVersion: output.promptVersion,
        modelVersion: output.modelVersion,
      });
    }
  );

  /**
   * POST /api/ai/daily-recommendation
   * Generates a structured daily training recommendation for the authenticated user.
   */
  app.post(
    "/api/ai/daily-recommendation",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const userId = req.user.sub;
      const context = await aggregationService.getContextWindow(userId);
      const graph = compileCoachingGraph();
      const initialState = createInitialState(
        userId,
        "Generate my training recommendation for today based on my current form and history.",
        context
      );

      const output = await graph.invoke(initialState, {
        configurable: { userId },
      });

      return reply.send({
        formStatus: context.formStatus,
        currentTSB: context.currentTSB,
        recommendation: output.finalResponse,
        selectedAgents: output.selectedAgents,
        urgency: output.urgency,
      });
    }
  );

  /**
   * POST /api/ai/demo
   * Demo endpoint — no auth required, uses mock scenarios for testing.
   */
  app.post("/api/ai/demo", async (req, reply) => {
    const result = DemoRequestSchema.safeParse(req.body);
    if (!result.success) {
      return reply.status(400).send({ error: result.error.issues[0]?.message });
    }

    const { message, scenarioId } = result.data;
    const scenario = scenarioId ? getScenarioById(scenarioId) : ALL_SCENARIOS[0];
    if (!scenario) {
      return reply.status(404).send({ error: "Scenario not found" });
    }

    const userId = `mock-user-${scenario.id}`;
    const graph = compileCoachingGraph();
    const initialState = createInitialState(userId, message, scenario.context);

    const output = await graph.invoke(initialState, {
      configurable: { userId },
    });

    return reply.send({
      scenario: scenario.name,
      message,
      intent: output.intent,
      urgency: output.urgency,
      selectedAgents: output.selectedAgents,
      response: output.finalResponse,
    });
  });

  /**
   * GET /api/ai/scenarios
   * List available mock scenarios (dev/testing).
   */
  app.get("/api/ai/scenarios", async () => {
    return {
      scenarios: ALL_SCENARIOS.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        expectedBehavior: s.expectedBehavior,
        context: {
          tsb: s.context.currentTSB,
          formStatus: s.context.formStatus,
          goal: s.context.goal?.description,
          avgFatigue: s.context.avgFatigue,
          avgMood: s.context.avgMood,
          painSummary: s.context.painSummary,
        },
      })),
    };
  });

  /**
   * GET /api/ai/health
   */
  app.get("/api/ai/health", async () => ({
    status: "ok",
    mode: "real",
    iteration: 3,
    timestamp: new Date().toISOString(),
  }));
}
