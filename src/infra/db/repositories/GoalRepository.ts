import type { PrismaClient } from "../../../generated/prisma/client.js";

interface GoalData {
  userId: string;
  type: string;
  targetValue: number;
  targetDate: Date;
  context: string | null;
}

export class GoalRepository {
  constructor(private readonly db: PrismaClient) {}

  async create(data: GoalData) {
    return this.db.goal.create({ data: { ...data, status: "ACTIVE" } });
  }

  async findActive(userId: string) {
    return this.db.goal.findMany({
      where: { userId, status: "ACTIVE" },
      orderBy: { targetDate: "asc" },
    });
  }

  async findNextRace(userId: string) {
    return this.db.goal.findFirst({
      where: {
        userId,
        status: "ACTIVE",
        targetDate: { gte: new Date() },
      },
      orderBy: { targetDate: "asc" },
    });
  }

  async updateStatus(id: string, status: "ACTIVE" | "ACHIEVED" | "ABANDONED" | "EXPIRED") {
    await this.db.goal.update({ where: { id }, data: { status } });
  }
}
