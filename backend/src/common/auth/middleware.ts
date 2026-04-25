import type { FastifyReply, FastifyRequest } from "fastify";
import { forbidden, unauthorized } from "../errors.js";
import { hasPermission, type Permission, type Role } from "./permissions.js";
import { verifyAccessToken } from "./jwt.js";

export interface AuthContext {
  userId: string;
  universityId: string | null;
  roles: Role[];
}

declare module "fastify" {
  interface FastifyRequest {
    auth?: AuthContext;
  }
}

export async function requireAuth(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw unauthorized();
  }

  try {
    const claims = await verifyAccessToken(header.slice("Bearer ".length));
    request.auth = {
      userId: claims.sub,
      universityId: claims.universityId,
      roles: claims.roles
    };
  } catch {
    throw unauthorized();
  }
}

export function requirePermission(permission: Permission) {
  return async (request: FastifyRequest): Promise<void> => {
    if (!request.auth) {
      throw unauthorized();
    }

    if (!hasPermission(request.auth.roles, permission)) {
      throw forbidden();
    }
  };
}

export function requireTenant(request: FastifyRequest): string {
  const universityId = request.auth?.universityId;
  if (!universityId && !request.auth?.roles.includes("super_admin")) {
    throw forbidden();
  }

  if (!universityId) {
    throw forbidden();
  }

  return universityId;
}
