import type { PrismaClient } from "../../../generated/prisma/client.js";

interface WeeklyAggregateData {
  userId: string;
  weekStart: Date;
  weekNumber: number;
  year: number;
  totalDistanceM: number;
  totalDurationSec: number;
  totalElevationM: number;
  sessionCount: number;
  runCount: number;
  totalTss: number;
  ctl: number;
  atl: number;
  tsb: number;
  monotony: number;
  strain: number;
  avgPerceivedEffort: number | null;
}

export class AggregateRepository {
  constructor(private readonly db: PrismaClient) {}

  async upsert(data: WeeklyAggregateData): Promise<void> {
    const { userId, weekStart, ...rest } = data;
    await this.db.weeklyAggregate.upsert({
      where: { userId_weekStart: { userId, weekStart } },
      create: { userId, weekStart, ...rest },
      update: rest,
    });
  }

  async findRecent(userId: string, weeks: number) {
    return this.db.weeklyAggregate.findMany({
      where: { userId },
      orderBy: { weekStart: "desc" },
      take: weeks,
    });
  }

  async findLatest(userId: string) {
    return this.db.weeklyAggregate.findFirst({
      where: { userId },
      orderBy: { weekStart: "desc" },
    });
  }

  async deleteForUser(userId: string): Promise<void> {
    await this.db.weeklyAggregate.deleteMany({ where: { userId } });
  }
}
