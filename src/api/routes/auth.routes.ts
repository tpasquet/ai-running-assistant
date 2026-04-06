import type { FastifyPluginAsync } from "fastify";
import type { Queue } from "bullmq";
import { z } from "zod";
import type { StravaOAuth } from "../../infra/strava/StravaOAuth.js";

interface AuthRoutesOptions {
  oauth: StravaOAuth | null;
  stravaQueue: Queue;
}

const CallbackQuerySchema = z.object({
  code: z.string().min(1),
  scope: z.string().optional(),
});

export const authRoutes: FastifyPluginAsync<AuthRoutesOptions> = async (
  app,
  opts
) => {
  const { oauth, stravaQueue } = opts;

  app.get("/auth/strava/login", async (req, reply) => {
    if (!oauth) return reply.code(503).send({ error: "Strava integration not configured" });
    const redirectUri = `${req.protocol}://${req.hostname}/auth/strava/callback`;
    const url = oauth.getAuthorizationUrl(redirectUri);
    return reply.redirect(url);
  });

  app.get("/auth/strava/callback", async (req, reply) => {
    if (!oauth) return reply.code(503).send({ error: "Strava integration not configured" });
    const result = CallbackQuerySchema.safeParse(req.query);
    if (!result.success) {
      return reply.code(400).send({ error: "Missing required query param: code" });
    }

    const { userId } = await oauth.exchangeCode(result.data.code);

    await stravaQueue.add("initial-sync", {
      type: "initial-sync",
      userId,
    });

    const jwt = app.jwt.sign({ sub: userId }, { expiresIn: "7d" });
    return reply.send({ jwt });
  });
};
