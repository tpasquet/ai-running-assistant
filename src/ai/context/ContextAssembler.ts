import type { AggregatedContext } from "../../shared/types/domain.types.js";

/**
 * ContextAssembler - Transforms structured data into LLM-ready text
 *
 * Converts AggregatedContext into a concise text summary (~800-1000 tokens)
 * optimized for LLM consumption. The output is structured in sections:
 * - Athlete Profile
 * - Training Load (8 weeks)
 * - Current State (CTL/ATL/TSB)
 * - Recent Activities
 * - Subjective Feedback
 * - Current Plan (if exists)
 */
export class ContextAssembler {
  /**
   * Assemble complete context for LLM
   */
  assemble(context: AggregatedContext): string {
    const sections: string[] = [];

    sections.push(this.buildProfileSection(context));
    sections.push(this.buildLoadSection(context));
    sections.push(this.buildCurrentStateSection(context));
    sections.push(this.buildActivitiesSection(context));
    sections.push(this.buildFeedbackSection(context));

    if (context.currentPlanWeek) {
      sections.push(this.buildPlanSection(context));
    }

    return sections.join("\n\n");
  }

  private buildProfileSection(ctx: AggregatedContext): string {
    let text = "## Athlete Profile\n";

    if (ctx.goal) {
      text += `Goal: ${ctx.goal.description} in ${ctx.goal.daysRemaining} days\n`;
    } else {
      text += `Goal: None set\n`;
    }

    text += `Level: ${ctx.athleteLevel}`;

    if (ctx.estimatedVO2max) {
      text += ` | Estimated VO2max: ${ctx.estimatedVO2max} ml/kg/min`;
    }

    return text;
  }

  private buildLoadSection(ctx: AggregatedContext): string {
    if (ctx.weeklyAggs.length === 0) {
      return "## Training Load\nNo training data available";
    }

    let text = `## Training Load (${ctx.weeklyAggs.length} weeks)\n`;

    ctx.weeklyAggs.forEach((week, i) => {
      const distanceKm = Math.round(week.totalDistanceM / 1000);
      const tss = Math.round(week.totalTss);
      const tsb = week.tsb > 0 ? `+${week.tsb}` : `${week.tsb}`;

      text += `W${i + 1}: ${distanceKm}km | TSS ${tss} | TSB ${tsb}\n`;
    });

    return text.trimEnd();
  }

  private buildCurrentStateSection(ctx: AggregatedContext): string {
    const tsb = ctx.currentTSB > 0 ? `+${ctx.currentTSB}` : `${ctx.currentTSB}`;

    let text = "## Current State\n";
    text += `CTL: ${ctx.currentCTL} | ATL: ${ctx.currentATL} | TSB: ${tsb}\n`;
    text += `Status: ${ctx.formStatus.toUpperCase()}`;

    return text;
  }

  private buildActivitiesSection(ctx: AggregatedContext): string {
    if (ctx.recentActivities.length === 0) {
      return "## Recent Activities\nNo recent activities";
    }

    const limit = Math.min(ctx.recentActivities.length, 5);
    let text = `## Recent Activities (last ${limit})\n`;

    ctx.recentActivities.slice(0, limit).forEach((activity) => {
      const distanceKm = (activity.distanceM / 1000).toFixed(1);
      const pace = this.formatPace(activity.avgPaceSecKm);
      const durationMin = Math.round(activity.durationSec / 60);

      text += `${activity.date}: ${distanceKm}km in ${durationMin}min @ ${pace}/km`;

      if (activity.perceivedEffort) {
        text += ` | RPE ${activity.perceivedEffort}/10`;
      }

      if (activity.tss) {
        text += ` | TSS ${Math.round(activity.tss)}`;
      }

      // Render lap breakdown for structured sessions (>1 lap)
      if (activity.laps?.length > 1) {
        text += ` | ${activity.laps.length} laps`;
        text += "\n";
        activity.laps.forEach((lap) => {
          const lapKm = (lap.distanceM / 1000).toFixed(2);
          const lapPace = this.formatPace(lap.avgPaceSecKm);
          const lapMin = Math.round(lap.movingTimeSec / 60);
          text += `  L${lap.lapIndex}: ${lapKm}km @ ${lapPace}/km in ${lapMin}min`;
          if (lap.avgHrBpm) text += ` | HR ${lap.avgHrBpm}bpm`;
          if (lap.paceZone && lap.paceZone > 0) text += ` | zone ${lap.paceZone}`;
          text += "\n";
        });
      } else {
        text += "\n";
      }
    });

    return text.trimEnd();
  }

  private buildFeedbackSection(ctx: AggregatedContext): string {
    let text = "## Subjective Feedback (7-day average)\n";
    text += `Fatigue: ${ctx.avgFatigue.toFixed(1)}/10\n`;
    text += `Mood: ${ctx.avgMood.toFixed(1)}/10\n`;
    text += `Sleep quality: ${ctx.avgSleep.toFixed(1)}/10\n`;
    text += `Pain: ${ctx.painSummary || "none reported"}`;

    if (ctx.lastPainFeedback) {
      text += `\nLast pain note: ${ctx.lastPainFeedback}`;
    }

    return text;
  }

  private buildPlanSection(ctx: AggregatedContext): string {
    let text = "## Current Training Plan\n";
    text += `Week ${ctx.currentPlanWeek}/${ctx.totalPlanWeeks}`;

    if (ctx.currentPhase) {
      text += ` — Phase: ${ctx.currentPhase}`;
    }

    if (ctx.plannedSessions.length > 0) {
      text += `\nPlanned sessions: ${ctx.plannedSessions.join(", ")}`;
    }

    return text;
  }

  private formatPace(paceSecKm: number): string {
    const minutes = Math.floor(paceSecKm / 60);
    const seconds = Math.round(paceSecKm % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }
}

/** Singleton — reuse across requests, no per-request allocation */
export const contextAssembler = new ContextAssembler();
