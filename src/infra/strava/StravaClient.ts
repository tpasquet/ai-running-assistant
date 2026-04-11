import { StravaRateLimitError, AppError } from "../../shared/errors/AppError.js";

const STRAVA_BASE = "https://www.strava.com/api/v3";

export interface StravaActivity {
  id: number;
  type: string;
  sport_type?: string;
  start_date: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  average_speed: number;
  max_speed: number;
  average_heartrate?: number;
  max_heartrate?: number;
  calories?: number;
  average_cadence?: number;
  average_temp?: number;
  map?: { summary_polyline?: string };
  gear_id?: string;
  // Enriched fields
  workout_type?: number;      // 0=default, 1=race, 2=long run, 3=workout
  suffer_score?: number;      // Strava suffer score
  perceived_exertion?: number; // RPE from Strava app (DetailedActivity only)
  elev_high?: number;         // Highest elevation (m)
  elev_low?: number;          // Lowest elevation (m)
  pr_count?: number;          // Personal records count
  trainer?: boolean;          // Treadmill activity
}

export interface StravaLap {
  id: number;
  lap_index: number;
  name?: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  average_speed: number;
  max_speed: number;
  average_heartrate?: number;
  max_heartrate?: number;
  average_cadence?: number;
  total_elevation_gain: number;
  pace_zone?: number;
  start_date: string;
}

export class StravaClient {
  constructor(private readonly accessToken: string) {}

  private async request<T>(url: string): Promise<T> {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });

    if (response.status === 429) {
      const retryAfter = parseInt(
        response.headers.get("X-RateLimit-Reset") ?? "60"
      );
      throw new StravaRateLimitError(retryAfter);
    }

    if (!response.ok) {
      throw new AppError(
        `Strava API error: ${response.status}`,
        response.status,
        "STRAVA_API_ERROR"
      );
    }

    return response.json() as Promise<T>;
  }

  async getActivities(params: {
    after: Date;
    page: number;
    perPage: number;
  }): Promise<StravaActivity[]> {
    const afterUnix = Math.floor(params.after.getTime() / 1000);
    const url = `${STRAVA_BASE}/athlete/activities?after=${afterUnix}&page=${params.page}&per_page=${params.perPage}`;
    return this.request<StravaActivity[]>(url);
  }

  async getActivity(stravaId: number): Promise<StravaActivity> {
    return this.request<StravaActivity>(
      `${STRAVA_BASE}/activities/${stravaId}`
    );
  }

  async getLaps(stravaActivityId: number): Promise<StravaLap[]> {
    return this.request<StravaLap[]>(
      `${STRAVA_BASE}/activities/${stravaActivityId}/laps`
    );
  }
}
