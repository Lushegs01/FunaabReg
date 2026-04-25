import type { FastifyRequest } from "fastify";
import { prisma } from "../db/prisma.js";

export interface AuditInput {
  action: string;
  targetType: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}

export async function audit(request: FastifyRequest, input: AuditInput): Promise<void> {
  const userAgent = request.headers["user-agent"];

  await prisma.auditLog.create({
    data: {
      universityId: request.auth?.universityId ?? null,
      actorUserId: request.auth?.userId ?? null,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      requestId: request.id,
      ipAddress: request.ip,
      userAgent: Array.isArray(userAgent) ? userAgent.join(", ") : userAgent,
      metadata: input.metadata ?? {}
    }
  });
}
