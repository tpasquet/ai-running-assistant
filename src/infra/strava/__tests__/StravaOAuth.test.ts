import { describe, it, expect, vi, beforeEach } from "vitest";
import { encrypt } from "../../../shared/utils/crypto.js";
import { StravaOAuth } from "../StravaOAuth.js";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const mockPrisma = {
  user: { upsert: vi.fn() },
  stravaToken: { upsert: vi.fn(), findMany: vi.fn() },
} as any;

const config = {
  clientId: "test-client-id",
  clientSecret: "test-client-secret",
  encryptionKey: "0".repeat(64),
};

describe("StravaOAuth", () => {
  let oauth: StravaOAuth;

  beforeEach(() => {
    vi.clearAllMocks();
    oauth = new StravaOAuth(mockPrisma, config);
  });

  it("returns Strava authorization URL", () => {
    const url = oauth.getAuthorizationUrl("http://localhost:3000/auth/strava/callback");
    expect(url).toContain("strava.com/oauth/authorize");
    expect(url).toContain("activity:read_all");
  });

  it("exchanges code for tokens and creates user", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: "access-123",
        refresh_token: "refresh-456",
        expires_at: Math.floor(Date.now() / 1000) + 21600,
        athlete: { id: 99, username: "runner_terry" },
        scope: "activity:read_all",
      }),
    });

    mockPrisma.user.upsert.mockResolvedValue({
      id: "user-1",
      stravaId: 99,
      username: "runner_terry",
      createdAt: new Date(),
    });
    mockPrisma.stravaToken.upsert.mockResolvedValue({});

    const result = await oauth.exchangeCode("auth-code-xyz");

    expect(result.userId).toBe("user-1");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://www.strava.com/oauth/token",
      expect.objectContaining({ method: "POST" })
    );

    // Tokens must be stored encrypted (not plain text)
    const upsertCall = mockPrisma.stravaToken.upsert.mock.calls[0][0];
    expect(upsertCall.create.accessTokenEnc).not.toBe("access-123");
    expect(upsertCall.create.refreshTokenEnc).not.toBe("refresh-456");
  });

  it("throws StravaAuthError when OAuth exchange fails", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 400 });

    await expect(oauth.exchangeCode("bad-code")).rejects.toThrow("OAuth exchange failed");
  });

  it("refreshes tokens for users expiring within 1 hour", async () => {
    const soonExpiry = new Date(Date.now() + 30 * 60 * 1000);

    mockPrisma.stravaToken.findMany.mockResolvedValue([
      {
        id: "tok-1",
        userId: "user-1",
        accessTokenEnc: encrypt("old-access", config.encryptionKey),
        refreshTokenEnc: encrypt("old-refresh", config.encryptionKey),
        expiresAt: soonExpiry,
        scope: "activity:read_all",
        updatedAt: new Date(),
      },
    ]);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: "new-access",
        refresh_token: "new-refresh",
        expires_at: Math.floor(Date.now() / 1000) + 21600,
      }),
    });

    mockPrisma.stravaToken.upsert.mockResolvedValue({});

    await oauth.refreshExpiringTokens();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockPrisma.stravaToken.upsert).toHaveBeenCalledTimes(1);
  });
});
