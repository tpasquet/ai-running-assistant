import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AggregationService } from "../../domain/aggregation/AggregationService.js";
import { getFormStatus } from "../../domain/aggregation/load.js";
import { prisma } from "../../infra/db/prisma.js";
import { redis } from "../../infra/cache/redis.js";

const QuerySchema = z.object({
  weeks: z.coerce.number().int().min(1).max(52).default(8),
});

export async function aggregationRoutes(app: FastifyInstance) {
  const service = new AggregationService(prisma, redis);

  app.get("/aggregations/weekly", async (request, reply) => {
    await request.authenticate();

    const parsed = QuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid query params", details: parsed.error.flatten() });
    }

    const userId = request.user.userId;
    const { weeks } = parsed.data;

    const weeklyAggs = await prisma.weeklyAggregate.findMany({
      where: { userId },
      orderBy: { weekStart: "desc" },
      take: weeks,
      select: {
        weekNumber: true,
        year: true,
        weekStart: true,
        totalDistanceM: true,
        totalTss: true,
        ctl: true,
        atl: true,
        tsb: true,
        sessionCount: true,
      },
    });

    const latest = weeklyAggs[0];
    const currentLoad = latest
      ? {
          ctl: latest.ctl,
          atl: latest.atl,
          tsb: latest.tsb,
          formStatus: getFormStatus(latest.tsb),
        }
      : { ctl: 0, atl: 0, tsb: 0, formStatus: "fresh" as const };

    return reply.send({ weeks: weeklyAggs, currentLoad });
  });
}
