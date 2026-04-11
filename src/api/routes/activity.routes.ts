import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../infra/db/prisma.js";

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  type: z.enum(["Run", "TrailRun", "VirtualRun"]).optional(),
});

export async function activityRoutes(app: FastifyInstance) {
  app.get("/activities", { preHandler: [app.authenticate] }, async (request, reply) => {
    const parsed = QuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid query params", details: parsed.error.flatten() });
    }

    const { limit, offset, type } = parsed.data;
    const userId = request.user.sub;

    const [items, total] = await Promise.all([
      prisma.activity.findMany({
        where: {
          userId,
          type: type ? { equals: type } : { in: ["Run", "TrailRun", "VirtualRun"] },
        },
        orderBy: { startDate: "desc" },
        take: limit,
        skip: offset,
        select: {
          id: true,
          type: true,
          startDate: true,
          distanceM: true,
          movingTimeSec: true,
          avgPaceSecKm: true,
          avgHrBpm: true,
          totalElevationGainM: true,
          tss: true,
          perceivedEffort: true,
        },
      }),
      prisma.activity.count({
        where: {
          userId,
          type: type ? { equals: type } : { in: ["Run", "TrailRun", "VirtualRun"] },
        },
      }),
    ]);

    return reply.send({ items, total, hasMore: offset + limit < total });
  });
}
