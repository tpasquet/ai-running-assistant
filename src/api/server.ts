import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { aiRoutes } from "./routes/ai.routes.js";
import { authRoutes } from "./routes/auth.routes.js";
import { webhookRoutes } from "./routes/webhook.routes.js";
import { activityRoutes } from "./routes/activity.routes.js";
import { aggregationRoutes } from "./routes/aggregation.routes.js";
import { feedbackRoutes } from "./routes/feedback.routes.js";
import { goalRoutes } from "./routes/goal.routes.js";
import { authPlugin } from "./plugins/auth.plugin.js";
import { devRoutes } from "./routes/dev.routes.js";
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

  await app.register(cors, {
    origin: process.env.CORS_ORIGIN ?? true,
    credentials: true,
  });

  await app.register(rateLimit, {
    global: false, // opt-in per route via config.rateLimit
  });

  await app.register(authPlugin, {
    jwtSecret: getEnv("JWT_SECRET"),
  });

  const stravaEnabled = !!(process.env.STRAVA_CLIENT_ID && process.env.STRAVA_CLIENT_SECRET);
  const oauth = stravaEnabled
    ? new StravaOAuth(prisma, {
        clientId: process.env.STRAVA_CLIENT_ID!,
        clientSecret: process.env.STRAVA_CLIENT_SECRET!,
        encryptionKey: getEnv("ENCRYPTION_KEY"),
      })
    : null;

  await app.register(aiRoutes);
  await app.register(authRoutes, { oauth, stravaQueue });
  await app.register(webhookRoutes, {
    stravaQueue,
    verifyToken: getEnv("STRAVA_WEBHOOK_VERIFY_TOKEN"),
  });
  await app.register(activityRoutes);
  await app.register(aggregationRoutes);
  await app.register(feedbackRoutes);
  await app.register(goalRoutes);

  if (process.env.NODE_ENV === "development") {
    await app.register(devRoutes);
  }

  app.get("/", async () => ({
    name: "RunCoach AI",
    version: "0.1.0",
    iteration: 3,
    status: "ok",
  }));

  app.get("/health", async () => ({ ok: true }));

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
