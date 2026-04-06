import type { PrismaClient } from "../../generated/prisma/client.js";
import { FeedbackRepository } from "../../infra/db/repositories/FeedbackRepository.js";
import type { PainLocation } from "../../shared/types/domain.types.js";
import { AppError } from "../../shared/errors/AppError.js";

export interface SubmitFeedbackInput {
  userId: string;
  date: Date;
  fatigue: number;
  muscleSoreness: number;
  mood: number;
  sleepQuality: number;
  painLocations: PainLocation[];
  painIntensity: number | null;
  notes: string | null;
}

export class FeedbackService {
  private readonly repo: FeedbackRepository;

  constructor(db: PrismaClient) {
    this.repo = new FeedbackRepository(db);
  }

  async submit(input: SubmitFeedbackInput): Promise<void> {
    const { userId, date, ...rest } = input;

    // Validate: pain intensity must be set if pain locations are reported
    if (rest.painLocations.length > 0 && rest.painIntensity === null) {
      throw new AppError(
        "painIntensity is required when painLocations are reported",
        400,
        "VALIDATION_ERROR",
      );
    }

    // Normalise date to midnight UTC (strip time component)
    const normalizedDate = new Date(date);
    normalizedDate.setUTCHours(0, 0, 0, 0);

    await this.repo.upsert({ userId, date: normalizedDate, ...rest });
  }

  async getRecent(userId: string, days = 7) {
    return this.repo.findRecent(userId, days);
  }
}
