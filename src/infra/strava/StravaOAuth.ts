import { encrypt, decrypt } from "../../shared/utils/crypto.js";
import { StravaAuthError } from "../../shared/errors/AppError.js";
import type { PrismaClient } from "../../generated/prisma/client.js";

interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  encryptionKey: string;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete?: { id: number; username: string };
  scope?: string;
}

export class StravaOAuth {
  constructor(
    private readonly db: PrismaClient,
    private readonly config: OAuthConfig
  ) {}

  getAuthorizationUrl(redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: redirectUri,
      response_type: "code",
    });
    return `https://www.strava.com/oauth/authorize?${params}&scope=activity:read_all`;
  }

  async exchangeCode(code: string): Promise<{ userId: string }> {
    const response = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
        grant_type: "authorization_code",
      }),
    });

    if (!response.ok) {
      throw new StravaAuthError(`OAuth exchange failed: ${response.status}`);
    }

    const data = (await response.json()) as TokenResponse;

    if (!data.athlete) {
      throw new StravaAuthError("No athlete data in OAuth response");
    }

    const user = await this.db.user.upsert({
      where: { stravaId: data.athlete.id },
      create: { stravaId: data.athlete.id, username: data.athlete.username },
      update: { username: data.athlete.username },
    });

    await this.storeToken(user.id, data);

    return { userId: user.id };
  }

  async getAccessToken(userId: string): Promise<string> {
    const token = await this.db.stravaToken.findFirst({ where: { userId } });
    if (!token) throw new StravaAuthError(`No token for user ${userId}`);
    return decrypt(token.accessTokenEnc, this.config.encryptionKey);
  }

  async refreshExpiringTokens(): Promise<void> {
    const threshold = new Date(Date.now() + 60 * 60 * 1000);
    const tokens = await this.db.stravaToken.findMany({
      where: { expiresAt: { lt: threshold } },
    });

    for (const token of tokens) {
      const refreshToken = decrypt(token.refreshTokenEnc, this.config.encryptionKey);
      const response = await fetch("https://www.strava.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          refresh_token: refreshToken,
          grant_type: "refresh_token",
        }),
      });

      if (!response.ok) continue;

      const data = (await response.json()) as TokenResponse;
      await this.storeToken(token.userId, data);
    }
  }

  private async storeToken(userId: string, data: TokenResponse): Promise<void> {
    const { encryptionKey } = this.config;
    await this.db.stravaToken.upsert({
      where: { userId },
      create: {
        userId,
        accessTokenEnc: encrypt(data.access_token, encryptionKey),
        refreshTokenEnc: encrypt(data.refresh_token, encryptionKey),
        expiresAt: new Date(data.expires_at * 1000),
        scope: data.scope ?? "activity:read_all",
      },
      update: {
        accessTokenEnc: encrypt(data.access_token, encryptionKey),
        refreshTokenEnc: encrypt(data.refresh_token, encryptionKey),
        expiresAt: new Date(data.expires_at * 1000),
      },
    });
  }
}
