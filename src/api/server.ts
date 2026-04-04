import Fastify from "fastify";
import cors from "@fastify/cors";
import { aiRoutes } from "./routes/ai.routes.js";
import { authRoutes } from "./routes/auth.routes.js";
import { webhookRoutes } from "./routes/webhook.routes.js";
import { activityRoutes } from "./routes/activity.routes.js";
import { aggregationRoutes } from "./routes/aggregation.routes.js";
import { feedbackRoutes } from "./routes/feedback.routes.js";
import { goalRoutes } from "./routes/goal.routes.js";
import { authPlugin } from "./plugins/auth.plugin.js";
import { StravaOAuth } from "../infra/strava/StravaOAuth.js";
import { stravaQueue } from "../infra/queue/queues.js";
import { prisma } from "../infra/db/prisma.js";

function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}

export async function createServer() {
  const app = Fastify({
    logger: { level: process.env.LOG_LEVEL ?? "info" },
  });

  await app.register(cors, { origin: true });

  await app.register(authPlugin, {
    jwtSecret: getEnv("JWT_SECRET"),
  });

  const oauth = new StravaOAuth(prisma, {
    clientId: getEnv("STRAVA_CLIENT_ID"),
    clientSecret: getEnv("STRAVA_CLIENT_SECRET"),
    encryptionKey: getEnv("ENCRYPTION_KEY"),
  });

  await app.register(aiRoutes, { prefix: "/api" });
  await app.register(authRoutes, { oauth, stravaQueue });
  await app.register(webhookRoutes, {
    stravaQueue,
    verifyToken: getEnv("STRAVA_WEBHOOK_VERIFY_TOKEN"),
  });
  await app.register(activityRoutes);
  await app.register(aggregationRoutes);
  await app.register(feedbackRoutes);
  await app.register(goalRoutes);

  app.get("/", async () => ({
    name: "RunCoach AI",
    version: "0.1.0",
    iteration: 2,
    status: "ok",
  }));

  // Health check for Railway
  app.get("/health", async (req, reply) => {
    return { status: "ok" };
  });

  return app;
}

export async function startServer() {
  const app = await createServer();
  const port = Number(process.env.PORT) || 3000;
  const host = process.env.HOST ?? "0.0.0.0";

  try {
    await app.listen({ port, host });
    console.log(`🏃 RunCoach AI listening on http://${host}:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  return app;
}
