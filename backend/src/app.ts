import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import { ZodError } from "zod";
import { HttpError } from "./common/errors.js";
import { prisma } from "./common/db/prisma.js";
import { redis } from "./common/redis.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { registrationRoutes } from "./modules/registration/registration.routes.js";

export async function buildApp() {
  const app = Fastify({
    logger: true,
    requestIdHeader: "x-request-id"
  });

  await app.register(helmet);
  await app.register(cors, {
    origin: true,
    credentials: true
  });
  await app.register(rateLimit, {
    max: 120,
    timeWindow: "1 minute",
    redis,
    keyGenerator: (request) => request.auth?.userId ?? request.ip
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: "validation_failed",
        message: "The request payload is invalid.",
        details: error.flatten()
      });
    }

    if (error instanceof HttpError) {
      return reply.status(error.statusCode).send({
        error: error.code,
        message: error.message
      });
    }

    request.log.error({ err: error }, "unhandled_request_error");
    return reply.status(500).send({
      error: "internal_server_error",
      message: "Something went wrong."
    });
  });

  app.get("/healthz", async () => {
    await prisma.$queryRaw`SELECT 1`;
    await redis.ping();
    return { ok: true };
  });

  await app.register(authRoutes, { prefix: "/api/v1/auth" });
  await app.register(registrationRoutes, { prefix: "/api/v1/registrations" });

  return app;
}
