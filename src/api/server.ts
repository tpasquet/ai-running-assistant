import Fastify from "fastify";
import cors from "@fastify/cors";
import { aiRoutes } from "./routes/ai.routes.js";

/**
 * Fastify server setup
 * Iteration 1: Mock mode with AI endpoints only
 */
export async function createServer() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || "info",
    },
  });

  // Register CORS
  await app.register(cors, {
    origin: true, // Allow all origins in development
  });

  // Register routes
  await app.register(aiRoutes, { prefix: "/api" });

  // Root health check
  app.get("/", async (req, reply) => {
    return {
      name: "RunCoach AI",
      version: "0.1.0",
      iteration: 1,
      mode: "mock",
      status: "ok",
    };
  });

  return app;
}

/**
 * Start server
 */
export async function startServer() {
  const app = await createServer();

  const port = Number(process.env.PORT) || 3000;
  const host = process.env.HOST || "0.0.0.0";

  try {
    await app.listen({ port, host });
    console.log(`🏃 RunCoach AI server listening on http://${host}:${port}`);
    console.log(`📦 Iteration 1: Mock Mode`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  return app;
}
