export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class StravaRateLimitError extends AppError {
  constructor(public readonly retryAfterSec: number) {
    super("Rate limit exceeded", 429, "STRAVA_RATE_LIMIT");
  }
}

export class StravaAuthError extends AppError {
  constructor(message: string) {
    super(message, 401, "STRAVA_AUTH_ERROR");
  }
}

export class ActivitySyncError extends AppError {
  constructor(message: string) {
    super(message, 500, "ACTIVITY_SYNC_ERROR");
  }
}
