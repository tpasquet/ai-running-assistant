import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { createCoachingGraph, compileCoachingGraph } from "../../ai/graph/graph.js";
import { ALL_SCENARIOS, getScenarioById } from "../../ai/mocks/scenarios.fixture.js";
import { createInitialState } from "../../ai/graph/state.js";

/**
 * AI Routes - Chat and recommendation endpoints
 * Iteration 1: Uses mock scenarios
 */

const ChatRequestSchema = z.object({
  message: z.string().min(1).max(500),
  scenarioId: z.string().optional(),
});

export async function aiRoutes(app: FastifyInstance) {
  /**
   * POST /ai/chat
   * Main chat endpoint - streams agent responses
   */
  app.post("/ai/chat", async (req, reply) => {
    try {
      const { message, scenarioId } = ChatRequestSchema.parse(req.body);

      // Select mock scenario (default to overreached)
      const scenario = scenarioId
        ? getScenarioById(scenarioId)
        : ALL_SCENARIOS[0];

      if (!scenario) {
        return reply.status(404).send({ error: "Scenario not found" });
      }

      const userId = `mock-user-${scenario.id}`;
      const context = scenario.context;

      // Compile and run graph
      const graph = compileCoachingGraph();
      const initialState = createInitialState(userId, message, context);

      const result = await graph.invoke(initialState);

      // Return final response
      return {
        scenario: scenario.name,
        userId,
        message,
        intent: result.intent,
        urgency: result.urgency,
        selectedAgents: result.selectedAgents,
        response: result.finalResponse,
        promptVersion: result.promptVersion,
        modelVersion: result.modelVersion,
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: error.errors });
      }
      throw error;
    }
  });

  /**
   * GET /ai/scenarios
   * List available mock scenarios for testing
   */
  app.get("/ai/scenarios", async (req, reply) => {
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
   * GET /ai/health
   * Health check endpoint
   */
  app.get("/ai/health", async (req, reply) => {
    return {
      status: "ok",
      mode: "mock",
      iteration: 1,
      timestamp: new Date().toISOString(),
    };
  });
}
