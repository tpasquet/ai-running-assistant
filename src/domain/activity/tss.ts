/**
 * TSS (Training Stress Score) calculations.
 * Pure functions — no external dependencies.
 */

/**
 * Compute TSS using heart rate (Banister TRIMP-derived method).
 * Used when avgHrBpm and maxHrBpm are available.
 */
export function computeTSSWithHR(
  durationSec: number,
  avgHrBpm: number,
  maxHrBpm: number,
  restingHrBpm = 50,
): number {
  if (durationSec <= 0 || avgHrBpm <= restingHrBpm || maxHrBpm <= restingHrBpm) return 0;

  const hrReserve = (avgHrBpm - restingHrBpm) / (maxHrBpm - restingHrBpm);
  const intensityFactor = Math.min(hrReserve * 1.05, 1.5);
  const tss = (durationSec / 3600) * intensityFactor * intensityFactor * 100;
  return Math.round(tss * 10) / 10;
}

/**
 * Compute TSS from pace when HR is not available.
 * Uses the ratio of threshold pace to actual pace as intensity factor.
 *
 * @param thresholdPaceSecKm - athlete's estimated threshold pace (approx 10K race pace)
 */
export function computeTSSFromPace(
  durationSec: number,
  avgPaceSecKm: number,
  thresholdPaceSecKm: number,
): number {
  if (durationSec <= 0 || avgPaceSecKm <= 0 || thresholdPaceSecKm <= 0) return 0;

  // Faster pace → higher intensity. Cap at 1.15 to avoid outliers.
  const intensityFactor = Math.min(thresholdPaceSecKm / avgPaceSecKm, 1.15);
  const tss = (durationSec / 3600) * intensityFactor * intensityFactor * 100;
  return Math.round(tss * 10) / 10;
}
