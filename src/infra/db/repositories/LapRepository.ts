import { prisma } from "../prisma.js";

export interface LapData {
  activityId: string;
  lapIndex: number;
  name: string | null;
  distanceM: number;
  movingTimeSec: number;
  elapsedTimeSec: number;
  avgSpeedMS: number;
  maxSpeedMS: number;
  avgPaceSecKm: number;
  avgHrBpm: number | null;
  maxHrBpm: number | null;
  avgCadence: number | null;
  totalElevationGainM: number;
  paceZone: number | null;
  startDate: Date;
}

export class LapRepository {
  /**
   * Upsert all laps for a given activity (replace on conflict).
   * Runs in a transaction so the set is always consistent.
   */
  async upsertMany(laps: LapData[]): Promise<void> {
    if (laps.length === 0) return;

    await prisma.$transaction(
      laps.map((lap) =>
        prisma.lap.upsert({
          where: {
            activityId_lapIndex: {
              activityId: lap.activityId,
              lapIndex: lap.lapIndex,
            },
          },
          create: lap,
          update: {
            name: lap.name,
            distanceM: lap.distanceM,
            movingTimeSec: lap.movingTimeSec,
            elapsedTimeSec: lap.elapsedTimeSec,
            avgSpeedMS: lap.avgSpeedMS,
            maxSpeedMS: lap.maxSpeedMS,
            avgPaceSecKm: lap.avgPaceSecKm,
            avgHrBpm: lap.avgHrBpm,
            maxHrBpm: lap.maxHrBpm,
            avgCadence: lap.avgCadence,
            totalElevationGainM: lap.totalElevationGainM,
            paceZone: lap.paceZone,
            startDate: lap.startDate,
          },
        })
      )
    );
  }

  async findByActivity(activityId: string) {
    return prisma.lap.findMany({
      where: { activityId },
      orderBy: { lapIndex: "asc" },
    });
  }

  async deleteByActivity(activityId: string): Promise<void> {
    await prisma.lap.deleteMany({ where: { activityId } });
  }
}
