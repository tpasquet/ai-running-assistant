import { StravaRateLimitError, AppError } from "../../shared/errors/AppError.js";

const STRAVA_BASE = "https://www.strava.com/api/v3";

export interface StravaActivity {
  id: number;
  type: string;
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
}
