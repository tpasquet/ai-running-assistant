import { describe, it, expect, vi, beforeEach } from "vitest";
import Fastify from "fastify";
import { authPlugin } from "../../plugins/auth.plugin.js";
import { aiRoutes } from "../ai.routes.js";

// Mock infra dependencies
vi.mock("../../../infra/db/prisma.js", () => ({
  prisma: {
    activity: { findMany: vi.fn().mockResolvedValue([]) },
    dailyFeedback: { findMany: vi.fn().mockResolvedValue([]) },
  },
}));

vi.mock("../../../infra/cache/redis.js", () => ({
  redis: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue("OK"),
    del: vi.fn().mockResolvedValue(1),
  },
}));

// Mock AggregationService to avoid real DB calls
vi.mock("../../../domain/aggregation/AggregationService.js", () => ({
  AggregationService: vi.fn().mockImplementation(() => ({
    getContextWindow: vi.fn().mockResolvedValue({
      goal: null,
      athleteLevel: "intermediate",
      estimatedVO2max: null,
      weeklyAggs: [],
      recentActivities: [],
      currentCTL: 0,
      currentATL: 0,
      currentTSB: 0,
      formStatus: "fresh",
      avgFatigue: 0,
      avgMood: 0,
      avgSleep: 0,
      painSummary: null,
      lastPainFeedback: null,
      currentPlanWeek: null,
      totalPlanWeeks: null,
      currentPhase: null,
      plannedSessions: [],
    }),
  })),
}));

// Mock the graph to avoid real LLM calls
vi.mock("../../../ai/graph/graph.js", () => ({
  compileCoachingGraph: vi.fn().mockReturnValue({
    invoke: vi.fn().mockResolvedValue({
      intent: "TRAINING_QUESTION",
      urgency: "low",
      selectedAgents: ["coach"],
      finalResponse: "You are well rested. A moderate run is recommended.",
      promptVersion: "v1",
      modelVersion: "gpt-4o-mini",
    }),
  }),
}));

const JWT_SECRET = "test-secret";

async function buildApp() {
  const app = Fastify({ logger: false });
  await app.register(authPlugin, { jwtSecret: JWT_SECRET });
  await app.register(aiRoutes);
  await app.ready();
  return app;
}

function makeToken(app: ReturnType<typeof Fastify>) {
  return (app as any).jwt.sign({ sub: "user-1", email: "test@example.com" });
}

describe("ai routes", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("POST /api/ai/chat", () => {
    it("returns 401 without auth", async () => {
      const app = await buildApp();
      const res = await app.inject({ method: "POST", url: "/api/ai/chat", payload: { message: "hello" } });
      expect(res.statusCode).toBe(401);
      await app.close();
    });

    it("returns AI response when authenticated", async () => {
      const app = await buildApp();
      const token = makeToken(app);
      const res = await app.inject({
        method: "POST",
        url: "/api/ai/chat",
        headers: { authorization: `Bearer ${token}` },
        payload: { message: "Should I run today?" },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.response).toBeDefined();
      expect(body.intent).toBe("TRAINING_QUESTION");
      await app.close();
    });

    it("returns 400 for empty message", async () => {
      const app = await buildApp();
      const token = makeToken(app);
      const res = await app.inject({
        method: "POST",
        url: "/api/ai/chat",
        headers: { authorization: `Bearer ${token}` },
        payload: { message: "" },
      });
      expect(res.statusCode).toBe(400);
      await app.close();
    });
  });

  describe("POST /api/ai/daily-recommendation", () => {
    it("returns 401 without auth", async () => {
      const app = await buildApp();
      const res = await app.inject({ method: "POST", url: "/api/ai/daily-recommendation" });
      expect(res.statusCode).toBe(401);
      await app.close();
    });

    it("returns recommendation when authenticated", async () => {
      const app = await buildApp();
      const token = makeToken(app);
      const res = await app.inject({
        method: "POST",
        url: "/api/ai/daily-recommendation",
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.recommendation).toBeDefined();
      expect(body.formStatus).toBe("fresh");
      await app.close();
    });
  });

  describe("POST /api/ai/demo", () => {
    it("returns mock response without auth", async () => {
      const app = await buildApp();
      const res = await app.inject({
        method: "POST",
        url: "/api/ai/demo",
        payload: { message: "test" },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.scenario).toBeDefined();
      expect(body.response).toBeDefined();
      await app.close();
    });
  });

  describe("GET /api/ai/scenarios", () => {
    it("returns scenario list", async () => {
      const app = await buildApp();
      const res = await app.inject({ method: "GET", url: "/api/ai/scenarios" });
      expect(res.statusCode).toBe(200);
      expect(res.json().scenarios.length).toBeGreaterThan(0);
      await app.close();
    });
  });

  describe("GET /api/ai/health", () => {
    it("reports real mode", async () => {
      const app = await buildApp();
      const res = await app.inject({ method: "GET", url: "/api/ai/health" });
      expect(res.statusCode).toBe(200);
      expect(res.json().mode).toBe("real");
      await app.close();
    });
  });
});
