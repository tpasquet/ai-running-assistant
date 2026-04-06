/**
 * CTL / ATL / TSB calculations.
 * Pure functions — no external dependencies.
 *
 * CTL (Chronic Training Load)  = fitness, 42-day exponential moving average
 * ATL (Acute Training Load)    = fatigue, 7-day exponential moving average
 * TSB (Training Stress Balance) = form = CTL - ATL
 */

const CTL_DAYS = 42;
const ATL_DAYS = 7;

export interface LoadMetrics {
  ctl: number;
  atl: number;
  tsb: number;
}

export type FormStatus = "fresh" | "optimal" | "tired" | "overreached";

/**
 * Incremental update from the previous day's values.
 * Called after each activity is ingested.
 */
export function updateLoadMetrics(
  previousCtl: number,
  previousAtl: number,
  todayTss: number,
): LoadMetrics {
  const ctl = previousCtl + (todayTss - previousCtl) / CTL_DAYS;
  const atl = previousAtl + (todayTss - previousAtl) / ATL_DAYS;
  const tsb = ctl - atl;

  return {
    ctl: Math.round(ctl * 10) / 10,
    atl: Math.round(atl * 10) / 10,
    tsb: Math.round(tsb * 10) / 10,
  };
}

/**
 * Full recalculation from scratch (initial sync or full rebuild).
 * Days with no activity are treated as TSS = 0 (rest day).
 */
export function recalculateLoadFromScratch(
  dailyTss: Array<{ date: Date; tss: number }>,
): Array<{ date: Date } & LoadMetrics> {
  let ctl = 0;
  let atl = 0;

  return dailyTss
    .slice()
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map(({ date, tss }) => {
      const metrics = updateLoadMetrics(ctl, atl, tss);
      ctl = metrics.ctl;
      atl = metrics.atl;
      return { date, ...metrics };
    });
}

/**
 * Classify form based on TSB value.
 *
 *  TSB > +10          → fresh      (under-trained or peak taper)
 *  TSB -10 to +10     → optimal    (race-ready zone)
 *  TSB -20 to -10     → tired      (productive fatigue)
 *  TSB < -20          → overreached (risk zone)
 */
export function getFormStatus(tsb: number): FormStatus {
  if (tsb > 10) return "fresh";
  if (tsb >= -10) return "optimal";
  if (tsb >= -20) return "tired";
  return "overreached";
}

/**
 * Training monotony = avg daily TSS / std deviation of daily TSS.
 * High monotony (> 2) indicates insufficient variation → injury risk.
 */
export function computeMonotony(dailyTssValues: number[]): number {
  if (dailyTssValues.length === 0) return 0;
  const avg = dailyTssValues.reduce((s, v) => s + v, 0) / dailyTssValues.length;
  const variance =
    dailyTssValues.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / dailyTssValues.length;
  const std = Math.sqrt(variance);
  return std === 0 ? 0 : Math.round((avg / std) * 100) / 100;
}

/**
 * Training strain = weekly TSS × monotony.
 */
export function computeStrain(weeklyTss: number, monotony: number): number {
  return Math.round(weeklyTss * monotony * 10) / 10;
}
