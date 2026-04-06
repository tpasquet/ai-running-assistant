import { startServer } from "./api/server.js";
import { startWorker } from "./infra/queue/workers/strava-sync.worker.js";
import { startTokenRefreshCron } from "./infra/queue/cron.js";
import { StravaOAuth } from "./infra/strava/StravaOAuth.js";
import { prisma } from "./infra/db/prisma.js";

function getEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}

const stravaClientId = process.env.STRAVA_CLIENT_ID;
const stravaClientSecret = process.env.STRAVA_CLIENT_SECRET;

let worker: ReturnType<typeof startWorker> | null = null;
let tokenRefreshCron: ReturnType<typeof startTokenRefreshCron> | null = null;

if (stravaClientId && stravaClientSecret) {
  const oauth = new StravaOAuth(prisma, {
    clientId: stravaClientId,
    clientSecret: stravaClientSecret,
    encryptionKey: getEnv("ENCRYPTION_KEY"),
  });

  worker = startWorker(oauth);
  worker.on("failed", (job, err) => {
    console.error(`Job ${job?.id ?? "unknown"} failed:`, err.message);
  });

  tokenRefreshCron = startTokenRefreshCron(oauth);
} else {
  console.warn("⚠️  STRAVA_CLIENT_ID/SECRET not set — Strava sync disabled");
}

process.on("SIGTERM", async () => {
  if (tokenRefreshCron) clearInterval(tokenRefreshCron);
  if (worker) await worker.close();
  await prisma.$disconnect();
  process.exit(0);
});

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
