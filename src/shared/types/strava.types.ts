/**
 * Strava API response types
 * Based on actual Strava API responses
 */

export interface StravaActivity {
  id: number;
  name: string;
  description: string | null;
  type: string;
  sport_type: string;
  start_date: string; // ISO 8601
  start_date_local: string;
  timezone: string;

  // Distance & Time
  distance: number; // meters
  moving_time: number; // seconds
  elapsed_time: number; // seconds
  total_elevation_gain: number; // meters

  // Speed
  average_speed: number; // m/s
  max_speed: number; // m/s

  // Heart Rate
  has_heartrate: boolean;
  average_heartrate?: number; // bpm
  max_heartrate?: number; // bpm

  // Other metrics
  calories?: number;
  average_cadence?: number; // steps/min for running
  average_temp?: number; // celsius

  // Location
  start_latlng: [number, number] | null;
  end_latlng: [number, number] | null;
  location_city: string | null;
  location_state: string | null;
  location_country: string | null;

  // Gear
  gear_id: string | null;
  gear?: {
    id: string;
    primary: boolean;
    name: string;
    nickname: string;
    resource_state: number;
    retired: boolean;
    distance: number;
    converted_distance: number;
  };

  // Splits
  splits_metric?: StravaSplit[];
}

export interface StravaSplit {
  distance: number; // meters
  elapsed_time: number; // seconds
  elevation_difference: number; // meters
  moving_time: number; // seconds
  split: number; // split number (1, 2, 3...)
  average_speed: number; // m/s
  average_grade_adjusted_speed?: number; // m/s
  average_heartrate?: number; // bpm
  pace_zone?: number; // Strava pace zone (1-5)
}

/**
 * Helper to convert Strava activity to our Activity type
 */
export function convertStravaActivity(
  strava: StravaActivity,
  userId: string
): {
  stravaId: bigint;
  userId: string;
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
  gearId: string | null;
} {
  const avgPaceSecKm = strava.average_speed > 0
    ? (1000 / strava.average_speed) // convert m/s to sec/km
    : 0;

  return {
    stravaId: BigInt(strava.id),
    userId,
    type: strava.type,
    startDate: new Date(strava.start_date),
    distanceM: strava.distance,
    movingTimeSec: strava.moving_time,
    elapsedTimeSec: strava.elapsed_time,
    totalElevationGainM: strava.total_elevation_gain,
    averageSpeedMS: strava.average_speed,
    maxSpeedMS: strava.max_speed,
    avgPaceSecKm: Math.round(avgPaceSecKm),
    avgHrBpm: strava.average_heartrate ?? null,
    maxHrBpm: strava.max_heartrate ?? null,
    calories: strava.calories ?? null,
    avgCadence: strava.average_cadence ?? null,
    avgTemp: strava.average_temp ?? null,
    gearId: strava.gear_id,
  };
}
