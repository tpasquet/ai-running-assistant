import { subDays } from "./dateUtils.js";
import { sleep } from "../../shared/utils/sleep.js";
import { StravaRateLimitError } from "../../shared/errors/AppError.js";
import type { StravaClient, StravaActivity, StravaLap } from "./StravaClient.js";
import type { ActivityRepository } from "../db/repositories/ActivityRepository.js";
import type { LapRepository, LapData } from "../db/repositories/LapRepository.js";

const SYNC_DAYS = 90;
const PAGE_SIZE = 100;
const PAGE_SLEEP_MS = 500;
const ALLOWED_TYPES = new Set(["Run", "TrailRun", "VirtualRun"]);

export class StravaSync {
  constructor(
    private readonly client: StravaClient,
    private readonly repo: ActivityRepository,
    private readonly lapRepo: LapRepository
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
        const { id: activityId } = await this.repo.upsert(
          this.toActivityData(userId, activity)
        );
        await this.syncLaps(activityId, activity.id);
      }

      page++;
      await sleep(PAGE_SLEEP_MS);
    }
  }

  async syncActivity(userId: string, stravaId: number): Promise<void> {
    const activity = await this.client.getActivity(stravaId);
    if (!ALLOWED_TYPES.has(activity.type)) return;

    const { id: activityId } = await this.repo.upsert(
      this.toActivityData(userId, activity)
    );
    await this.syncLaps(activityId, stravaId);
  }

  /**
   * Fetch laps from Strava and upsert them for a given activity.
   * Silently skips on error (laps are enrichment data, not critical).
   */
  private async syncLaps(
    activityId: string,
    stravaActivityId: number
  ): Promise<void> {
    try {
      const stravaLaps = await this.client.getLaps(stravaActivityId);
      const laps = stravaLaps.map((l) => this.toLapData(activityId, l));
      await this.lapRepo.upsertMany(laps);
    } catch (err) {
      console.warn(
        `[StravaSync] Failed to sync laps for activity ${stravaActivityId}:`,
        err
      );
    }
  }

  private toActivityData(userId: string, a: StravaActivity) {
    const distanceKm = a.distance / 1000;
    const avgPaceSecKm = distanceKm > 0 ? a.moving_time / distanceKm : 0;

    return {
      userId,
      stravaId: BigInt(a.id),
      name: a.name ?? null,
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
      sportType: a.sport_type ?? null,
      workoutType: a.workout_type ?? null,
      sufferScore: a.suffer_score ?? null,
      perceivedExertion: a.perceived_exertion ?? null,
      elevHigh: a.elev_high ?? null,
      elevLow: a.elev_low ?? null,
      prCount: a.pr_count ?? null,
      isTrainer: a.trainer ?? false,
    };
  }

  private toLapData(activityId: string, l: StravaLap): LapData {
    const distanceKm = l.distance / 1000;
    const avgPaceSecKm = distanceKm > 0 ? l.moving_time / distanceKm : 0;

    return {
      activityId,
      lapIndex: l.lap_index,
      name: l.name ?? null,
      distanceM: l.distance,
      movingTimeSec: l.moving_time,
      elapsedTimeSec: l.elapsed_time,
      avgSpeedMS: l.average_speed,
      maxSpeedMS: l.max_speed,
      avgPaceSecKm,
      avgHrBpm: l.average_heartrate != null ? Math.round(l.average_heartrate) : null,
      maxHrBpm: l.max_heartrate != null ? Math.round(l.max_heartrate) : null,
      avgCadence: l.average_cadence ?? null,
      totalElevationGainM: l.total_elevation_gain,
      paceZone: l.pace_zone ?? null,
      startDate: new Date(l.start_date),
    };
  }
}
