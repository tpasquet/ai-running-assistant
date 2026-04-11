import type { PrismaClient, User, Account } from "../../../generated/prisma/client.js";

export type UserWithAccounts = User & { accounts: Account[] };

export class AccountRepository {
  constructor(private readonly db: PrismaClient) {}

  async findUserByEmail(email: string): Promise<UserWithAccounts | null> {
    return this.db.user.findUnique({
      where: { email },
      include: { accounts: true },
    });
  }

  async findUserById(id: string): Promise<User | null> {
    return this.db.user.findUnique({ where: { id } });
  }

  async findAccount(
    provider: string,
    providerAccountId: string
  ): Promise<(Account & { user: User }) | null> {
    return this.db.account.findUnique({
      where: { provider_providerAccountId: { provider, providerAccountId } },
      include: { user: true },
    });
  }

  async createUserWithEmailAccount(input: {
    email: string;
    name?: string;
    passwordHash: string;
  }): Promise<User> {
    return this.db.user.create({
      data: {
        email: input.email,
        name: input.name,
        accounts: {
          create: {
            provider: "email",
            providerAccountId: input.email,
            passwordHash: input.passwordHash,
          },
        },
      },
    });
  }

  async upsertOAuthUser(input: {
    provider: string;
    providerAccountId: string;
    email: string;
    name?: string;
  }): Promise<User> {
    // Try to find existing account
    const existing = await this.findAccount(
      input.provider,
      input.providerAccountId
    );
    if (existing) return existing.user;

    // Try to find existing user by email (merge accounts)
    const existingUser = await this.db.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      await this.db.account.create({
        data: {
          userId: existingUser.id,
          provider: input.provider,
          providerAccountId: input.providerAccountId,
        },
      });
      return existingUser;
    }

    // Create new user + account
    return this.db.user.create({
      data: {
        email: input.email,
        name: input.name,
        emailVerified: true, // OAuth providers verify email
        accounts: {
          create: {
            provider: input.provider,
            providerAccountId: input.providerAccountId,
          },
        },
      },
    });
  }

  async createPasswordResetToken(input: {
    userId: string;
    token: string;
    expiresAt: Date;
  }): Promise<void> {
    // Invalidate any existing unused tokens
    await this.db.passwordResetToken.updateMany({
      where: { userId: input.userId, usedAt: null },
      data: { usedAt: new Date() },
    });
    await this.db.passwordResetToken.create({ data: input });
  }

  async consumePasswordResetToken(
    token: string
  ): Promise<{ userId: string } | null> {
    const record = await this.db.passwordResetToken.findUnique({
      where: { token },
    });
    if (!record) return null;
    if (record.usedAt) return null;
    if (record.expiresAt < new Date()) return null;

    await this.db.passwordResetToken.update({
      where: { token },
      data: { usedAt: new Date() },
    });
    return { userId: record.userId };
  }

  async updatePasswordHash(userId: string, passwordHash: string): Promise<void> {
    await this.db.account.updateMany({
      where: { userId, provider: "email" },
      data: { passwordHash },
    });
  }
}
