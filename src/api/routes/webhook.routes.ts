import type { FastifyPluginAsync } from "fastify";
import type { Queue } from "bullmq";

interface WebhookRoutesOptions {
  stravaQueue: Queue;
  verifyToken: string;
}

interface StravaWebhookEvent {
  object_type: string;
  aspect_type: string;
  object_id: number;
  owner_id: number;
  subscription_id: number;
  event_time: number;
}

export const webhookRoutes: FastifyPluginAsync<WebhookRoutesOptions> = async (
  app,
  opts
) => {
  const { stravaQueue, verifyToken } = opts;

  // Strava subscription validation
  app.get("/strava/webhook", async (req, reply) => {
    const query = req.query as Record<string, string>;
    if (query["hub.verify_token"] !== verifyToken) {
      return reply.code(403).send({ error: "Invalid verify token" });
    }
    return reply.send({ "hub.challenge": query["hub.challenge"] });
  });

  // Real-time event handler
  app.post("/strava/webhook", async (req, reply) => {
    const body = req.body as StravaWebhookEvent;

    if (
      body.object_type === "activity" &&
      ["create", "update"].includes(body.aspect_type)
    ) {
      await stravaQueue.add("sync-activity", {
        type: "sync-activity",
        stravaActivityId: body.object_id,
        stravaOwnerId: body.owner_id,
        userId: String(body.owner_id), // resolved to real userId by worker via DB lookup
      });
    }

    return reply.code(200).send();
  });
};
