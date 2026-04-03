import { describe, it, expect, beforeAll } from "vitest";
import { compileCoachingGraph } from "../ai/graph/graph.js";
import { createInitialState } from "../ai/graph/state.js";
import { SCENARIO_OVERREACHED, SCENARIO_FRESH } from "../ai/mocks/scenarios.fixture.js";

/**
 * Integration tests for the full coaching graph
 * These tests verify end-to-end behavior but skip LLM calls in CI
 */

describe("Coaching Graph Integration", () => {
  // Skip if no API key (CI environment)
  const skipLLM = !process.env.OPENAI_API_KEY;

  describe("Graph Compilation", () => {
    it("should compile graph without errors", () => {
      const graph = compileCoachingGraph();
      expect(graph).toBeDefined();
    });
  });

  describe.skipIf(skipLLM)("End-to-End Execution", () => {
    it("should handle overreached athlete query", async () => {
      const graph = compileCoachingGraph();
      const state = createInitialState(
        "mock-user-overreached",
        "Should I run today?",
        SCENARIO_OVERREACHED
      );

      const result = await graph.invoke(state);

      expect(result.selectedAgents).toBeDefined();
      expect(result.intent).toBeDefined();
      expect(result.urgency).toBeDefined();
      expect(result.finalResponse).toBeDefined();

      // Overreached athlete should trigger multiple agents
      expect(result.selectedAgents.length).toBeGreaterThan(0);
      // High TSB negative should be high urgency
      expect(result.urgency).toBe("high");
    }, 30000); // 30s timeout for LLM calls

    it("should handle fresh athlete query", async () => {
      const graph = compileCoachingGraph();
      const state = createInitialState(
        "mock-user-fresh",
        "What workout should I do today?",
        SCENARIO_FRESH
      );

      const result = await graph.invoke(state);

      expect(result.selectedAgents).toContain("coach");
      expect(result.intent).toBe("TRAINING_QUESTION");
      expect(result.finalResponse).toBeDefined();
    }, 30000);
  });

  describe("State Management", () => {
    it("should create valid initial state", () => {
      const state = createInitialState(
        "test-user",
        "Test message",
        SCENARIO_OVERREACHED
      );

      expect(state.userId).toBe("test-user");
      expect(state.message).toBe("Test message");
      expect(state.context).toBeDefined();
      expect(state.selectedAgents).toEqual([]);
      expect(state.coachOutput).toBeNull();
      expect(state.physioOutput).toBeNull();
      expect(state.mentalOutput).toBeNull();
    });
  });
});
