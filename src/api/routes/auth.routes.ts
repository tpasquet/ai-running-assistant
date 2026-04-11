import type { FastifyPluginAsync } from "fastify";
import type { Queue } from "bullmq";
import { z } from "zod";
import { AuthService, AuthError } from "../../domain/auth/AuthService.js";
import { AccountRepository } from "../../infra/db/repositories/AccountRepository.js";
import { GoogleOAuth } from "../../infra/google/GoogleOAuth.js";
import type { StravaOAuth } from "../../infra/strava/StravaOAuth.js";
import { prisma } from "../../infra/db/prisma.js";
import { randomUUID } from "node:crypto";

interface AuthRoutesOptions {
  oauth: StravaOAuth | null;
  stravaQueue: Queue;
}

// ── Zod schemas ────────────────────────────────────────────────────

const RegisterBody = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(100).optional(),
});

const LoginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const ForgotPasswordBody = z.object({
  email: z.string().email(),
});

const ResetPasswordBody = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

const StravaCallbackQuery = z.object({
  code: z.string().min(1),
  scope: z.string().optional(),
});

// ── OAuth state store (in-memory, TTL 10 min) ─────────────────────

const oauthStates = new Map<string, number>();
const STATE_TTL_MS = 10 * 60 * 1000;

function generateState(): string {
  const state = randomUUID();
  oauthStates.set(state, Date.now());
  for (const [k, ts] of oauthStates) {
    if (Date.now() - ts > STATE_TTL_MS) oauthStates.delete(k);
  }
  return state;
}

function validateState(state: string): boolean {
  const ts = oauthStates.get(state);
  if (!ts) return false;
  oauthStates.delete(state);
  return Date.now() - ts <= STATE_TTL_MS;
}

// ── Helpers ────────────────────────────────────────────────────────

function getEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

function firstIssue(err: z.ZodError): string {
  return err.issues[0]?.message ?? "Validation error";
}

// ── Plugin ─────────────────────────────────────────────────────────

interface AuthRoutesOptions {
  oauth: StravaOAuth;
  stravaQueue: Queue;
}

export const authRoutes: FastifyPluginAsync<AuthRoutesOptions> = async (
  app,
  opts
) => {
  const repo = new AccountRepository(prisma);
  const service = new AuthService(repo);
  const { oauth, stravaQueue } = opts;

  // ── POST /auth/register ──────────────────────────────────────────
  app.post("/auth/register", async (req, reply) => {
    const result = RegisterBody.safeParse(req.body);
    if (!result.success) {
      return reply.code(400).send({ error: firstIssue(result.error) });
    }
    try {
      const user = await service.register(result.data);
      const token = app.signToken({ sub: user.id, email: user.email });
      app.setAuthCookie(reply, token);
      return reply.code(201).send({ user });
    } catch (err) {
      if (err instanceof AuthError && err.code === "EMAIL_TAKEN") {
        return reply.code(409).send({ error: "Email already in use" });
      }
      throw err;
    }
  });

  // ── POST /auth/login ─────────────────────────────────────────────
  app.post(
    "/auth/login",
    { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (req, reply) => {
      const result = LoginBody.safeParse(req.body);
      if (!result.success) {
        return reply.code(400).send({ error: firstIssue(result.error) });
      }
      try {
        const user = await service.login(result.data);
        const token = app.signToken({ sub: user.id, email: user.email });
        app.setAuthCookie(reply, token);
        return reply.send({ user });
      } catch (err) {
        if (err instanceof AuthError && err.code === "INVALID_CREDENTIALS") {
          return reply.code(401).send({ error: "Invalid email or password" });
        }
        throw err;
      }
    }
  );

  // ── POST /auth/logout ────────────────────────────────────────────
  app.post("/auth/logout", async (_req, reply) => {
    app.clearAuthCookie(reply);
    return reply.send({ ok: true });
  });

  // ── GET /auth/me ─────────────────────────────────────────────────
  app.get(
    "/auth/me",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const user = await repo.findUserById(req.user.sub);
      if (!user) return reply.code(404).send({ error: "User not found" });
      return reply.send({
        user: { id: user.id, email: user.email, name: user.name },
      });
    }
  );

  // ── POST /auth/forgot-password ───────────────────────────────────
  app.post("/auth/forgot-password", async (req, reply) => {
    const result = ForgotPasswordBody.safeParse(req.body);
    if (!result.success) {
      return reply.code(400).send({ error: firstIssue(result.error) });
    }
    const reset = await service.createResetToken(result.data.email);
    // TODO: send email with reset link
    if (process.env.NODE_ENV !== "production" && reset) {
      return reply.send({ message: "Reset email sent", _devToken: reset.token });
    }
    return reply.send({
      message: "If this email exists, a reset link has been sent.",
    });
  });

  // ── POST /auth/reset-password ────────────────────────────────────
  app.post("/auth/reset-password", async (req, reply) => {
    const result = ResetPasswordBody.safeParse(req.body);
    if (!result.success) {
      return reply.code(400).send({ error: firstIssue(result.error) });
    }
    try {
      await service.resetPassword(result.data);
      return reply.send({ ok: true });
    } catch (err) {
      if (err instanceof AuthError && err.code === "TOKEN_INVALID") {
        return reply.code(400).send({ error: "Invalid or expired reset token" });
      }
      throw err;
    }
  });

  // ── GET /auth/google/login ───────────────────────────────────────
  app.get("/auth/google/login", async (req, reply) => {
    const redirectUri = `${req.protocol}://${req.hostname}/auth/google/callback`;
    const google = new GoogleOAuth(
      getEnv("GOOGLE_CLIENT_ID"),
      getEnv("GOOGLE_CLIENT_SECRET"),
      redirectUri
    );
    return reply.redirect(google.getAuthorizationUrl(generateState()));
  });

  // ── GET /auth/google/callback ────────────────────────────────────
  app.get("/auth/google/callback", async (req, reply) => {
    const query = req.query as {
      code?: string;
      state?: string;
      error?: string;
    };
    const authAppUrl = process.env.AUTH_APP_URL ?? "http://localhost:3001";

    if (query.error) {
      return reply.redirect(`${authAppUrl}/login?error=google_denied`);
    }
    if (!query.code || !query.state || !validateState(query.state)) {
      return reply.code(400).send({ error: "Invalid OAuth state" });
    }

    const redirectUri = `${req.protocol}://${req.hostname}/auth/google/callback`;
    const google = new GoogleOAuth(
      getEnv("GOOGLE_CLIENT_ID"),
      getEnv("GOOGLE_CLIENT_SECRET"),
      redirectUri
    );

    const googleUser = await google.exchangeCode(query.code);
    const user = await service.loginWithGoogle({
      sub: googleUser.sub,
      email: googleUser.email,
      name: googleUser.name,
    });

    const token = app.signToken({ sub: user.id, email: user.email });
    app.setAuthCookie(reply, token);

    const dashboardUrl = process.env.DASHBOARD_URL ?? "http://localhost:3002";
    return reply.redirect(`${dashboardUrl}?status=ok`);
  });

  // ── GET /auth/strava/login (data integration) ────────────────────
  app.get("/auth/strava/login", async (req, reply) => {
    if (!oauth) return reply.code(503).send({ error: "Strava integration not configured" });
    const redirectUri = `${req.protocol}://${req.hostname}/auth/strava/callback`;
    return reply.redirect(oauth.getAuthorizationUrl(redirectUri));
  });

  // ── GET /auth/strava/callback ────────────────────────────────────
  app.get("/auth/strava/callback", async (req, reply) => {
    if (!oauth) return reply.code(503).send({ error: "Strava integration not configured" });
    const result = CallbackQuerySchema.safeParse(req.query);
    if (!result.success) {
      return reply.code(400).send({ error: "Missing required query param: code" });
    }
    const { userId } = await oauth.exchangeCode(result.data.code);
    await stravaQueue.add("initial-sync", { type: "initial-sync", userId });
    const token = app.signToken({ sub: userId, email: "" });
    app.setAuthCookie(reply, token);
    const dashboardUrl = process.env.DASHBOARD_URL ?? "http://localhost:3002";
    return reply.redirect(`${dashboardUrl}?status=ok`);
  });
};
