import { describe, it, expect } from "vitest";
import { compileCoachingGraph } from "../ai/graph/graph.js";
import { createInitialState } from "../ai/graph/state.js";
import { SCENARIO_OVERREACHED, SCENARIO_FRESH } from "../ai/mocks/scenarios.fixture.js";

/**
 * Integration tests for the full coaching graph.
 * LLM tests are skipped when OPENAI_API_KEY is not set (CI without secret).
 */

describe("Coaching Graph Integration", () => {
  const skipLLM = !process.env.OPENAI_API_KEY;

  describe("Graph Compilation", () => {
    it("compiles without errors", () => {
      expect(compileCoachingGraph()).toBeDefined();
    });
  });

  describe("State Management", () => {
    it("creates valid initial state", () => {
      const state = createInitialState("user-1", "Test message", SCENARIO_OVERREACHED);
      expect(state.userId).toBe("user-1");
      expect(state.message).toBe("Test message");
      expect(state.selectedAgents).toEqual([]);
      expect(state.coachOutput).toBeNull();
    });
  });

  describe.skipIf(skipLLM)("End-to-End LLM Execution", () => {
    it("handles overreached athlete query", async () => {
      const graph = compileCoachingGraph();
      const state = createInitialState(
        "mock-user-overreached",
        "Should I run today?",
        SCENARIO_OVERREACHED
      );

      const result = await graph.invoke(state, {
        configurable: { userId: "mock-user-overreached" },
      });

      expect(result.selectedAgents.length).toBeGreaterThan(0);
      expect(result.intent).toBeDefined();
      expect(result.urgency).toBe("high");
      expect(result.finalResponse).toBeDefined();
    }, 30000);

    it("handles fresh athlete query", async () => {
      const graph = compileCoachingGraph();
      const state = createInitialState(
        "mock-user-fresh",
        "What workout should I do today?",
        SCENARIO_FRESH
      );

      const result = await graph.invoke(state, {
        configurable: { userId: "mock-user-fresh" },
      });

      expect(result.selectedAgents).toContain("coach");
      expect(result.intent).toBe("TRAINING_QUESTION");
      expect(result.finalResponse).toBeDefined();
    }, 30000);
  });
});
