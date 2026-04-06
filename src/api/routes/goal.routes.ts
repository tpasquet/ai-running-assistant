import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { GoalService } from "../../domain/goal/GoalService.js";
import { prisma } from "../../infra/db/prisma.js";
import { AppError } from "../../shared/errors/AppError.js";

const GoalTypes = [
  "SUB_X_5K", "SUB_X_10K", "SUB_X_HALF", "SUB_X_MARATHON",
  "FINISH_5K", "FINISH_10K", "FINISH_HALF", "FINISH_MARATHON",
  "WEEKLY_DISTANCE", "CUSTOM",
] as const;

const CreateBodySchema = z.object({
  type: z.enum(GoalTypes),
  targetValue: z.number().positive(),
  targetDate: z.string().datetime(),
  context: z.string().max(500).nullable().default(null),
});

export async function goalRoutes(app: FastifyInstance) {
  const service = new GoalService(prisma);

  app.post("/goals", async (request, reply) => {
    await request.authenticate();

    const parsed = CreateBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid body", details: parsed.error.flatten() });
    }

    const userId = request.user.userId;
    const { targetDate, ...rest } = parsed.data;

    try {
      const goal = await service.create({
        userId,
        targetDate: new Date(targetDate),
        ...rest,
      });
      return reply.code(201).send(goal);
    } catch (err) {
      if (err instanceof AppError) {
        return reply.code(err.statusCode).send({ error: err.message, code: err.code });
      }
      throw err;
    }
  });

  app.get("/goals", async (request, reply) => {
    await request.authenticate();
    const goals = await service.listActive(request.user.userId);
    return reply.send({ items: goals });
  });
}
