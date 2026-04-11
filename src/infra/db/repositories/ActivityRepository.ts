import type { PrismaClient } from "../../../generated/prisma/client.js";

interface ActivityData {
  userId: string;
  stravaId: bigint;
  type: string;
  startDate: Date;
  distanceM: number;
  movingTimeSec: number;
  elapsedTimeSec: number;
  totalElevationGainM: number;
  averageSpeedMS: number;
  maxSpeedMS: number;
  avgPaceSecKm: number;
  avgHrBpm: number | null;
  maxHrBpm: number | null;
  calories: number | null;
  avgCadence: number | null;
  avgTemp: number | null;
  perceivedEffort: number | null;
  tss: number | null;
  polyline: string | null;
  gearId: string | null;
}

export class ActivityRepository {
  constructor(private readonly db: PrismaClient) {}

  async upsert(data: ActivityData): Promise<{ id: string }> {
    const { stravaId, ...rest } = data;
    return this.db.activity.upsert({
      where: { stravaId },
      create: { stravaId, ...rest },
      update: rest,
      select: { id: true },
    });
  }

  async findRecent(userId: string, limit: number) {
    return this.db.activity.findMany({
      where: {
        userId,
        type: { in: ["Run", "TrailRun", "VirtualRun"] },
      },
      orderBy: { startDate: "desc" },
      take: limit,
    });
  }
}
