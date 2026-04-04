import { describe, it, expect, vi, beforeEach } from "vitest";
import Fastify from "fastify";
import { webhookRoutes } from "../webhook.routes.js";

const mockQueue = {
  add: vi.fn().mockResolvedValue({ id: "job-1" }),
} as any;

const VERIFY_TOKEN = "test-verify-token";

async function buildApp() {
  const app = Fastify({ logger: false });
  await app.register(webhookRoutes, {
    stravaQueue: mockQueue,
    verifyToken: VERIFY_TOKEN,
  });
  await app.ready();
  return app;
}

describe("webhook routes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("GET /strava/webhook validates Strava subscription challenge", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: `/strava/webhook?hub.verify_token=${VERIFY_TOKEN}&hub.challenge=abc123&hub.mode=subscribe`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ "hub.challenge": "abc123" });
    await app.close();
  });

  it("GET /strava/webhook rejects wrong verify token with 403", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: "/strava/webhook?hub.verify_token=wrong&hub.challenge=abc123&hub.mode=subscribe",
    });
    expect(res.statusCode).toBe(403);
    await app.close();
  });

  it("POST /strava/webhook enqueues sync-activity for activity events and returns 200", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/strava/webhook",
      payload: {
        object_type: "activity",
        aspect_type: "create",
        object_id: 999,
        owner_id: 42,
        subscription_id: 1,
        event_time: 1234567890,
      },
    });
    expect(res.statusCode).toBe(200);
    expect(mockQueue.add).toHaveBeenCalledWith(
      "sync-activity",
      expect.objectContaining({
        type: "sync-activity",
        stravaActivityId: 999,
        stravaOwnerId: 42,
      })
    );
    await app.close();
  });

  it("POST /strava/webhook ignores non-activity object types", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/strava/webhook",
      payload: {
        object_type: "athlete",
        aspect_type: "update",
        object_id: 42,
        owner_id: 42,
        subscription_id: 1,
        event_time: 1234567890,
      },
    });
    expect(res.statusCode).toBe(200);
    expect(mockQueue.add).not.toHaveBeenCalled();
    await app.close();
  });
});
