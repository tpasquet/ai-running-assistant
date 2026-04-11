import { describe, it, expect, beforeEach, vi } from "vitest";
import { AuthService, AuthError } from "../../domain/auth/AuthService.js";
import type { AccountRepository } from "../../infra/db/repositories/AccountRepository.js";

// ── Mock repository ────────────────────────────────────────────────

function makeRepo(): AccountRepository {
  return {
    findUserByEmail: vi.fn(),
    findUserById: vi.fn(),
    findAccount: vi.fn(),
    createUserWithEmailAccount: vi.fn(),
    upsertOAuthUser: vi.fn(),
    createPasswordResetToken: vi.fn(),
    consumePasswordResetToken: vi.fn(),
    updatePasswordHash: vi.fn(),
  } as unknown as AccountRepository;
}

function makeUser(overrides = {}) {
  return {
    id: "user_1",
    email: "test@example.com",
    name: "Test User",
    emailVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    accounts: [],
    passwordResetTokens: [],
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────

describe("AuthService.register", () => {
  let repo: AccountRepository;
  let service: AuthService;

  beforeEach(() => {
    repo = makeRepo();
    service = new AuthService(repo);
  });

  it("creates user when email is available", async () => {
    vi.mocked(repo.findUserByEmail).mockResolvedValue(null);
    vi.mocked(repo.createUserWithEmailAccount).mockResolvedValue(
      makeUser()
    );

    const result = await service.register({
      email: "test@example.com",
      password: "Password1",
      name: "Test User",
    });

    expect(result.email).toBe("test@example.com");
    expect(repo.createUserWithEmailAccount).toHaveBeenCalledOnce();
    const call = vi.mocked(repo.createUserWithEmailAccount).mock.calls[0]![0];
    expect(call.passwordHash).not.toBe("Password1"); // must be hashed
    expect(call.passwordHash.startsWith("$2")).toBe(true); // bcrypt prefix
  });

  it("throws EMAIL_TAKEN when email exists", async () => {
    vi.mocked(repo.findUserByEmail).mockResolvedValue(
      makeUser() as ReturnType<typeof makeUser>
    );

    await expect(
      service.register({ email: "test@example.com", password: "Password1" })
    ).rejects.toMatchObject({ code: "EMAIL_TAKEN" });
  });
});

describe("AuthService.login", () => {
  let repo: AccountRepository;
  let service: AuthService;

  beforeEach(() => {
    repo = makeRepo();
    service = new AuthService(repo);
  });

  it("throws INVALID_CREDENTIALS when user not found", async () => {
    vi.mocked(repo.findUserByEmail).mockResolvedValue(null);

    await expect(
      service.login({ email: "nope@example.com", password: "any" })
    ).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
  });

  it("throws INVALID_CREDENTIALS when password is wrong", async () => {
    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.hash("correct", 1);

    vi.mocked(repo.findUserByEmail).mockResolvedValue(
      makeUser({
        accounts: [
          { provider: "email", passwordHash: hash, providerAccountId: "test@example.com" },
        ],
      }) as ReturnType<typeof makeUser>
    );

    await expect(
      service.login({ email: "test@example.com", password: "wrong" })
    ).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
  });

  it("returns user when credentials are valid", async () => {
    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.hash("Password1", 1);

    vi.mocked(repo.findUserByEmail).mockResolvedValue(
      makeUser({
        accounts: [
          { provider: "email", passwordHash: hash, providerAccountId: "test@example.com" },
        ],
      }) as ReturnType<typeof makeUser>
    );

    const result = await service.login({
      email: "test@example.com",
      password: "Password1",
    });
    expect(result.id).toBe("user_1");
  });
});

describe("AuthService.loginWithGoogle", () => {
  it("upserts user and returns auth user", async () => {
    const repo = makeRepo();
    const service = new AuthService(repo);

    vi.mocked(repo.upsertOAuthUser).mockResolvedValue(makeUser());

    const result = await service.loginWithGoogle({
      sub: "google_123",
      email: "test@example.com",
      name: "Test User",
    });

    expect(result.email).toBe("test@example.com");
    expect(repo.upsertOAuthUser).toHaveBeenCalledWith({
      provider: "google",
      providerAccountId: "google_123",
      email: "test@example.com",
      name: "Test User",
    });
  });
});

describe("AuthService.resetPassword", () => {
  it("throws TOKEN_INVALID when token not found", async () => {
    const repo = makeRepo();
    const service = new AuthService(repo);

    vi.mocked(repo.consumePasswordResetToken).mockResolvedValue(null);

    await expect(
      service.resetPassword({ token: "bad", newPassword: "NewPass1" })
    ).rejects.toMatchObject({ code: "TOKEN_INVALID" });
  });

  it("hashes and updates password when token is valid", async () => {
    const repo = makeRepo();
    const service = new AuthService(repo);

    vi.mocked(repo.consumePasswordResetToken).mockResolvedValue({
      userId: "user_1",
    });
    vi.mocked(repo.updatePasswordHash).mockResolvedValue();

    await service.resetPassword({ token: "valid", newPassword: "NewPass1" });

    const call = vi.mocked(repo.updatePasswordHash).mock.calls[0]!;
    expect(call[0]).toBe("user_1");
    expect(call[1].startsWith("$2")).toBe(true); // bcrypt hash
  });

  it("returns null and does not throw when email not found (timing safety)", async () => {
    const repo = makeRepo();
    const service = new AuthService(repo);

    vi.mocked(repo.findUserByEmail).mockResolvedValue(null);

    const result = await service.createResetToken("unknown@example.com");
    expect(result).toBeNull();
    expect(repo.createPasswordResetToken).not.toHaveBeenCalled();
  });
});
