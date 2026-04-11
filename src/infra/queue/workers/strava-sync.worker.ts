import { Worker } from "bullmq";
import type { Job } from "bullmq";
import { redis } from "../../cache/redis.js";
import { prisma } from "../../db/prisma.js";
import { StravaClient } from "../../strava/StravaClient.js";
import { StravaSync } from "../../strava/StravaSync.js";
import { ActivityRepository } from "../../db/repositories/ActivityRepository.js";
import { LapRepository } from "../../db/repositories/LapRepository.js";
import type { StravaOAuth } from "../../strava/StravaOAuth.js";
import type { StravaSyncJobData } from "../queues.js";

/**
 * Pure job processor — extracted for testability.
 * syncFactory allows injecting a mock StravaSync in tests.
 */
export async function processStravaJob(
  job: Job<StravaSyncJobData>,
  oauth: StravaOAuth,
  syncFactory: (accessToken: string) => StravaSync
): Promise<void> {
  const { userId } = job.data;
  const accessToken = await oauth.getAccessToken(userId);
  const sync = syncFactory(accessToken);

  if (job.data.type === "initial-sync") {
    await sync.syncInitial(userId);
  } else if (job.data.type === "sync-activity") {
    await sync.syncActivity(userId, job.data.stravaActivityId);
  }
}

/**
 * Start the BullMQ worker. Called from the application entry point.
 */
export function startWorker(oauth: StravaOAuth): Worker {
  const repo = new ActivityRepository(prisma);
  const lapRepo = new LapRepository();

  return new Worker<StravaSyncJobData>(
    "strava-sync",
    async (job) => {
      await processStravaJob(job, oauth, (token) => {
        const client = new StravaClient(token);
        return new StravaSync(client, repo, lapRepo);
      });
    },
    { connection: redis, concurrency: 1 }
  );
}
