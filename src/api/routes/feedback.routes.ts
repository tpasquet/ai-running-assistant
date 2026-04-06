import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { FeedbackService } from "../../domain/feedback/FeedbackService.js";
import { prisma } from "../../infra/db/prisma.js";
import { AppError } from "../../shared/errors/AppError.js";

const BodyLocations = [
  "knee", "ankle", "achilles", "plantar_fascia", "shin", "calf",
  "hamstring", "quad", "hip", "it_band", "lower_back", "foot", "other",
] as const;

const BodySchema = z.object({
  date: z.string().date(),
  fatigue: z.number().int().min(1).max(10),
  muscleSoreness: z.number().int().min(1).max(10),
  mood: z.number().int().min(1).max(10),
  sleepQuality: z.number().int().min(1).max(10),
  painLocations: z
    .array(
      z.object({
        location: z.enum(BodyLocations),
        side: z.enum(["left", "right", "both"]).optional(),
        type: z.enum(["sharp", "dull", "burning", "tightness"]).optional(),
      }),
    )
    .default([]),
  painIntensity: z.number().int().min(1).max(10).nullable().default(null),
  notes: z.string().max(500).nullable().default(null),
});

export async function feedbackRoutes(app: FastifyInstance) {
  const service = new FeedbackService(prisma);

  app.post("/feedback/daily", async (request, reply) => {
    await request.authenticate();

    const parsed = BodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid body", details: parsed.error.flatten() });
    }

    const { date, ...rest } = parsed.data;
    const userId = request.user.userId;

    try {
      await service.submit({
        userId,
        date: new Date(date),
        ...rest,
      });
    } catch (err) {
      if (err instanceof AppError) {
        return reply.code(err.statusCode).send({ error: err.message, code: err.code });
      }
      throw err;
    }

    return reply.code(201).send({ ok: true });
  });
}
