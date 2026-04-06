import { describe, it, expect } from "vitest";
import Fastify from "fastify";
import { authPlugin } from "../auth.plugin.js";

async function buildApp() {
  const app = Fastify({ logger: false });
  await app.register(authPlugin, { jwtSecret: "test-secret" });
  app.get("/protected", { preHandler: [app.authenticate] }, async () => ({ ok: true }));
  await app.ready();
  return app;
}

describe("authPlugin", () => {
  it("rejects requests without Authorization header", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/protected" });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it("accepts valid JWT", async () => {
    const app = await buildApp();
    const token = app.jwt.sign({ sub: "user-1" });
    const res = await app.inject({
      method: "GET",
      url: "/protected",
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    await app.close();
  });

  it("rejects invalid JWT", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: "/protected",
      headers: { Authorization: "Bearer invalid.token.here" },
    });
    expect(res.statusCode).toBe(401);
    await app.close();
  });
});
