import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../common/auth/middleware.js";
import { audit } from "../../common/audit/audit.service.js";
import { prisma } from "../../common/db/prisma.js";
import { loginSchema, logoutSchema, refreshSchema } from "./auth.schema.js";
import * as authService from "./auth.service.js";

const headerAsString = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value.join(", ") : value;

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post("/login", async (request, reply) => {
    const input = loginSchema.parse(request.body);
    const tokens = await authService.login(input, {
      ip: request.ip,
      userAgent: headerAsString(request.headers["user-agent"])
    });

    await audit(request, {
      action: "auth.login",
      targetType: "user_session",
      metadata: { email: input.email, universityCode: input.universityCode }
    });

    return reply.send(tokens);
  });

  app.post("/refresh", async (request, reply) => {
    const input = refreshSchema.parse(request.body);
    const tokens = await authService.refresh(input.refreshToken, {
      ip: request.ip,
      userAgent: headerAsString(request.headers["user-agent"])
    });

    return reply.send(tokens);
  });

  app.post("/logout", async (request, reply) => {
    const input = logoutSchema.parse(request.body);
    await authService.logout(input.refreshToken);
    return reply.status(204).send();
  });

  app.get("/me", { preHandler: [requireAuth] }, async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.auth!.userId },
      select: {
        id: true,
        universityId: true,
        email: true,
        phone: true,
        status: true,
        roles: { select: { role: true } }
      }
    });

    return reply.send({ user });
  });
}
