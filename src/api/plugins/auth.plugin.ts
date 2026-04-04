import fp from "fastify-plugin";
import jwtPlugin from "@fastify/jwt";
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

interface AuthPluginOptions {
  jwtSecret: string;
}

const authPluginImpl: FastifyPluginAsync<AuthPluginOptions> = async (app, opts) => {
  await app.register(jwtPlugin, { secret: opts.jwtSecret });

  app.decorate(
    "authenticate",
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      try {
        await request.jwtVerify();
      } catch {
        await reply.code(401).send({ error: "Unauthorized" });
      }
    }
  );
};

export const authPlugin = fp(authPluginImpl, {
  name: "auth-plugin",
  fastify: "5.x",
});
