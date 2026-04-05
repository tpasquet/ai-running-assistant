import type { PrismaClient } from "../../../generated/prisma/client.js";
import type { PainLocation } from "../../../shared/types/domain.types.js";

interface FeedbackData {
  userId: string;
  date: Date;
  fatigue: number;
  muscleSoreness: number;
  mood: number;
  sleepQuality: number;
  painLocations: PainLocation[];
  painIntensity: number | null;
  notes: string | null;
}

export class FeedbackRepository {
  constructor(private readonly db: PrismaClient) {}

  async upsert(data: FeedbackData): Promise<void> {
    const { userId, date, painLocations, ...rest } = data;
    await this.db.dailyFeedback.upsert({
      where: { userId_date: { userId, date } },
      create: { userId, date, painLocations: painLocations as object[], ...rest },
      update: { painLocations: painLocations as object[], ...rest },
    });
  }

  async findRecent(userId: string, days: number) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    return this.db.dailyFeedback.findMany({
      where: { userId, date: { gte: since } },
      orderBy: { date: "desc" },
    });
  }

  async findLatestWithPain(userId: string) {
    return this.db.dailyFeedback.findFirst({
      where: {
        userId,
        painIntensity: { not: null },
      },
      orderBy: { date: "desc" },
    });
  }
}
