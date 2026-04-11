import { describe, it, expect, vi, beforeEach } from "vitest";
import Fastify from "fastify";
import { authPlugin } from "../../plugins/auth.plugin.js";
import { authRoutes } from "../auth.routes.js";

// Prevent PrismaClient instantiation in test environment
vi.mock("../../../infra/db/prisma.js", () => ({
  prisma: {
    user: { findUnique: vi.fn(), create: vi.fn() },
    account: { findUnique: vi.fn(), create: vi.fn() },
    passwordResetToken: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  },
}));

const mockOAuth = {
  getAuthorizationUrl: vi
    .fn()
    .mockReturnValue("https://www.strava.com/oauth/authorize?client_id=test"),
  exchangeCode: vi.fn().mockResolvedValue({ userId: "user-1" }),
} as any;

const mockQueue = {
  add: vi.fn().mockResolvedValue({ id: "job-1" }),
} as any;

async function buildApp() {
  const app = Fastify({ logger: false });
  await app.register(authPlugin, { jwtSecret: "test-secret" });
  await app.register(authRoutes, { oauth: mockOAuth, stravaQueue: mockQueue });
  await app.ready();
  return app;
}

describe("auth routes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("GET /auth/strava/login redirects to Strava", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/auth/strava/login" });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toContain("strava.com");
    await app.close();
  });

  it("GET /auth/strava/callback sets auth cookie and redirects to dashboard", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: "/auth/strava/callback?code=valid-code&scope=activity:read_all",
    });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toContain("status=ok");
    expect(res.headers["set-cookie"]).toBeDefined();
    expect(mockQueue.add).toHaveBeenCalledWith(
      "initial-sync",
      { type: "initial-sync", userId: "user-1" }
    );
    await app.close();
  });

  it("GET /auth/strava/callback rejects missing code with 400", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: "/auth/strava/callback",
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });
});
