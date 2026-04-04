import { startServer } from "./api/server.js";
import { startWorker } from "./infra/queue/workers/strava-sync.worker.js";
import { startTokenRefreshCron } from "./infra/queue/cron.js";
import { StravaOAuth } from "./infra/strava/StravaOAuth.js";
import { prisma } from "./infra/db/prisma.js";

function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}

const oauth = new StravaOAuth(prisma, {
  clientId: getEnv("STRAVA_CLIENT_ID"),
  clientSecret: getEnv("STRAVA_CLIENT_SECRET"),
  encryptionKey: getEnv("ENCRYPTION_KEY"),
});

const worker = startWorker(oauth);
worker.on("failed", (job, err) => {
  console.error(`Job ${job?.id ?? "unknown"} failed:`, err.message);
});

const tokenRefreshCron = startTokenRefreshCron(oauth);

process.on("SIGTERM", async () => {
  clearInterval(tokenRefreshCron);
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
});

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
