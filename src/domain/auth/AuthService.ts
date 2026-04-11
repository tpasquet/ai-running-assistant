import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import type { AccountRepository } from "../../infra/db/repositories/AccountRepository.js";

const BCRYPT_ROUNDS = 12;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly code: "INVALID_CREDENTIALS" | "EMAIL_TAKEN" | "TOKEN_INVALID"
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export class AuthService {
  constructor(private readonly repo: AccountRepository) {}

  // ── Email / password ────────────────────────────────────────────

  async register(input: {
    email: string;
    password: string;
    name?: string;
  }): Promise<AuthUser> {
    const existing = await this.repo.findUserByEmail(input.email);
    if (existing) {
      throw new AuthError("Email already in use", "EMAIL_TAKEN");
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    const user = await this.repo.createUserWithEmailAccount({
      email: input.email,
      name: input.name,
      passwordHash,
    });

    return { id: user.id, email: user.email!, name: user.name };
  }

  async login(input: { email: string; password: string }): Promise<AuthUser> {
    const user = await this.repo.findUserByEmail(input.email);
    if (!user) {
      throw new AuthError("Invalid credentials", "INVALID_CREDENTIALS");
    }

    const emailAccount = user.accounts.find((a: { provider: string }) => a.provider === "email") as
      | { provider: string; passwordHash: string | null }
      | undefined;
    if (!emailAccount?.passwordHash) {
      throw new AuthError("Invalid credentials", "INVALID_CREDENTIALS");
    }

    const valid = await bcrypt.compare(input.password, emailAccount.passwordHash);
    if (!valid) {
      throw new AuthError("Invalid credentials", "INVALID_CREDENTIALS");
    }

    return { id: user.id, email: user.email!, name: user.name };
  }

  // ── Google OAuth ─────────────────────────────────────────────────

  async loginWithGoogle(input: {
    sub: string;
    email: string;
    name?: string;
  }): Promise<AuthUser> {
    const user = await this.repo.upsertOAuthUser({
      provider: "google",
      providerAccountId: input.sub,
      email: input.email,
      name: input.name,
    });
    return { id: user.id, email: user.email!, name: user.name };
  }

  // ── Password reset ────────────────────────────────────────────────

  async createResetToken(email: string): Promise<{ token: string } | null> {
    const user = await this.repo.findUserByEmail(email);
    if (!user) return null; // Don't reveal whether email exists

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    await this.repo.createPasswordResetToken({ userId: user.id, token, expiresAt });
    return { token };
  }

  async resetPassword(input: {
    token: string;
    newPassword: string;
  }): Promise<void> {
    const record = await this.repo.consumePasswordResetToken(input.token);
    if (!record) {
      throw new AuthError("Invalid or expired reset token", "TOKEN_INVALID");
    }

    const passwordHash = await bcrypt.hash(input.newPassword, BCRYPT_ROUNDS);
    await this.repo.updatePasswordHash(record.userId, passwordHash);
  }
}
