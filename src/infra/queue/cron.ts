import type { StravaOAuth } from "../strava/StravaOAuth.js";

const INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Starts a recurring job to refresh Strava tokens expiring within 1 hour.
 * Returns the interval handle so it can be cleared on shutdown.
 */
export function startTokenRefreshCron(oauth: StravaOAuth): ReturnType<typeof setInterval> {
  return setInterval(async () => {
    try {
      await oauth.refreshExpiringTokens();
    } catch (err) {
      console.error("Token refresh cron error:", err);
    }
  }, INTERVAL_MS);
}
