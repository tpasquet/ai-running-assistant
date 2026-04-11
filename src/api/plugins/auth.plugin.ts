import fp from "fastify-plugin";
import jwtPlugin from "@fastify/jwt";
import cookiePlugin from "@fastify/cookie";
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";

const COOKIE_NAME = "rc_token";
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string; email: string };
    user: { sub: string; email: string };
  }
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    signToken: (payload: { sub: string; email: string }) => string;
    setAuthCookie: (reply: FastifyReply, token: string) => void;
    clearAuthCookie: (reply: FastifyReply) => void;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string; email: string };
    user: { sub: string; email: string };
  }
}

interface AuthPluginOptions {
  jwtSecret: string;
}

const authPluginImpl: FastifyPluginAsync<AuthPluginOptions> = async (
  app,
  opts
) => {
  await app.register(cookiePlugin);

  await app.register(jwtPlugin, {
    secret: opts.jwtSecret,
    cookie: { cookieName: COOKIE_NAME, signed: false },
  });

  app.decorate(
    "authenticate",
    async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
      try {
        await req.jwtVerify();
      } catch {
        await reply.code(401).send({ error: "Unauthorized" });
      }
    }
  );

  app.decorate(
    "signToken",
    (payload: { sub: string; email: string }): string =>
      app.jwt.sign(payload, { expiresIn: "7d" })
  );

  app.decorate("setAuthCookie", (reply: FastifyReply, token: string): void => {
    void reply.setCookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: COOKIE_MAX_AGE,
    });
  });

  app.decorate("clearAuthCookie", (reply: FastifyReply): void => {
    void reply.clearCookie(COOKIE_NAME, { path: "/" });
  });
};

export const authPlugin = fp(authPluginImpl, {
  name: "auth-plugin",
  fastify: "5.x",
});
