import { subDays } from "./dateUtils.js";
import { sleep } from "../../shared/utils/sleep.js";
import { StravaRateLimitError } from "../../shared/errors/AppError.js";
import type { StravaClient, StravaActivity } from "./StravaClient.js";
import type { ActivityRepository } from "../db/repositories/ActivityRepository.js";

const SYNC_DAYS = 90;
const PAGE_SIZE = 100;
const PAGE_SLEEP_MS = 500;
const ALLOWED_TYPES = new Set(["Run", "TrailRun", "VirtualRun"]);

export class StravaSync {
  constructor(
    private readonly client: StravaClient,
    private readonly repo: ActivityRepository
  ) {}

  async syncInitial(userId: string): Promise<void> {
    const after = subDays(new Date(), SYNC_DAYS);
    let page = 1;

    while (true) {
      let activities: StravaActivity[];

      try {
        activities = await this.client.getActivities({
          after,
          page,
          perPage: PAGE_SIZE,
        });
      } catch (err) {
        if (err instanceof StravaRateLimitError) {
          await sleep(err.retryAfterSec * 1000);
          continue; // retry same page
        }
        throw err;
      }

      if (activities.length === 0) break;

      const runs = activities.filter((a) => ALLOWED_TYPES.has(a.type));
      for (const activity of runs) {
        await this.repo.upsert(this.toActivityData(userId, activity));
      }

      page++;
      await sleep(PAGE_SLEEP_MS);
    }
  }

  async syncActivity(userId: string, stravaId: number): Promise<void> {
    const activity = await this.client.getActivity(stravaId);
    if (!ALLOWED_TYPES.has(activity.type)) return;
    await this.repo.upsert(this.toActivityData(userId, activity));
  }

  private toActivityData(userId: string, a: StravaActivity) {
    const distanceKm = a.distance / 1000;
    const avgPaceSecKm = distanceKm > 0 ? a.moving_time / distanceKm : 0;

    return {
      userId,
      stravaId: BigInt(a.id),
      type: a.type,
      startDate: new Date(a.start_date),
      distanceM: a.distance,
      movingTimeSec: a.moving_time,
      elapsedTimeSec: a.elapsed_time,
      totalElevationGainM: a.total_elevation_gain,
      averageSpeedMS: a.average_speed,
      maxSpeedMS: a.max_speed,
      avgPaceSecKm,
      avgHrBpm: a.average_heartrate ?? null,
      maxHrBpm: a.max_heartrate ?? null,
      calories: a.calories ?? null,
      avgCadence: a.average_cadence ?? null,
      avgTemp: a.average_temp ?? null,
      perceivedEffort: null,
      tss: null,
      polyline: a.map?.summary_polyline ?? null,
      gearId: a.gear_id ?? null,
    };
  }
}
