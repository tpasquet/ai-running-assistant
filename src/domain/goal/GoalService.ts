import type { PrismaClient } from "../../generated/prisma/client.js";
import { GoalRepository } from "../../infra/db/repositories/GoalRepository.js";
import { AppError } from "../../shared/errors/AppError.js";

export interface CreateGoalInput {
  userId: string;
  type: string;
  targetValue: number;
  targetDate: Date;
  context: string | null;
}

export class GoalService {
  private readonly repo: GoalRepository;

  constructor(db: PrismaClient) {
    this.repo = new GoalRepository(db);
  }

  async create(input: CreateGoalInput) {
    if (input.targetDate <= new Date()) {
      throw new AppError("targetDate must be in the future", 400, "VALIDATION_ERROR");
    }
    return this.repo.create({
      userId: input.userId,
      type: input.type,
      targetValue: input.targetValue,
      targetDate: input.targetDate,
      context: input.context,
    });
  }

  async listActive(userId: string) {
    return this.repo.findActive(userId);
  }
}
