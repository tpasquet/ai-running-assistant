import { Queue } from "bullmq";
import { redis } from "../cache/redis.js";

export type StravaSyncJobData =
  | { type: "initial-sync"; userId: string }
  | { type: "sync-activity"; userId: string; stravaActivityId: number; stravaOwnerId: number };

export const stravaQueue = new Queue("strava-sync", {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});
