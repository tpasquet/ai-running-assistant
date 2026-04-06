import type { FastifyInstance } from "fastify";

/**
 * Dev-only routes — only registered when NODE_ENV=development
 * Provides a quick way to get a JWT for testing without going through OAuth.
 */
export async function devRoutes(app: FastifyInstance) {
  app.post("/dev/token", async (req, reply) => {
    const body = req.body as { userId?: string; email?: string } | null;
    const sub = body?.userId ?? "dev-user-1";
    const email = body?.email ?? "dev@runcoach.ai";
    const token = app.jwt.sign({ sub, email }, { expiresIn: "7d" });
    return reply.send({ token, sub, email });
  });
}
