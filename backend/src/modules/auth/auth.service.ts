import argon2 from "argon2";
import type { Prisma } from "@prisma/client";
import { addSeconds } from "../../utils/time.js";
import { prisma } from "../../common/db/prisma.js";
import { HttpError, unauthorized } from "../../common/errors.js";
import { hashToken, signAccessToken, signRefreshToken, verifyRefreshToken } from "../../common/auth/jwt.js";
import type { Role } from "../../common/auth/permissions.js";
import { env } from "../../config/env.js";
import type { LoginInput } from "./auth.schema.js";

interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

function userRoles(user: { roles: { role: string }[] }): Role[] {
  return user.roles.map((assignment) => assignment.role as Role);
}

async function issueTokenPair(
  user: { id: string; universityId: string | null; roles: { role: string }[] },
  meta: RequestMeta
): Promise<TokenPair> {
  const roles = userRoles(user);
  const refreshToken = await signRefreshToken(user.id);
  const tokenHash = hashToken(refreshToken);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash,
      userAgent: meta.userAgent,
      ipAddress: meta.ip,
      expiresAt: addSeconds(new Date(), env.REFRESH_TOKEN_TTL_SECONDS)
    }
  });

  return {
    accessToken: await signAccessToken({
      sub: user.id,
      universityId: user.universityId,
      roles
    }),
    refreshToken,
    expiresIn: env.ACCESS_TOKEN_TTL_SECONDS
  };
}

export async function login(input: LoginInput, meta: RequestMeta): Promise<TokenPair> {
  const university = input.universityCode
    ? await prisma.university.findUnique({
        where: { code: input.universityCode.toUpperCase() }
      })
    : null;

  if (input.universityCode && !university) {
    throw unauthorized();
  }

  const matches = await prisma.user.findMany({
    where: {
      email: input.email,
      ...(university ? { universityId: university.id } : {})
    },
    include: { roles: true },
    take: 2
  });

  if (!university && matches.length !== 1) {
    throw new HttpError(400, "University code is required for this account.", "university_required");
  }

  const user = matches[0];

  if (!user || user.status !== "active") {
    throw unauthorized();
  }

  const passwordOk = await argon2.verify(user.passwordHash, input.password);
  if (!passwordOk) {
    throw unauthorized();
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() }
  });

  return issueTokenPair(user, meta);
}

export async function refresh(refreshToken: string, meta: RequestMeta): Promise<TokenPair> {
  const verified = await verifyRefreshToken(refreshToken).catch(() => null);
  if (!verified) {
    throw unauthorized();
  }

  const tokenHash = hashToken(refreshToken);
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        include: { roles: true }
      }
    }
  });

  if (!stored || stored.revokedAt || stored.expiresAt <= new Date() || stored.user.status !== "active") {
    throw unauthorized();
  }

  if (stored.userId !== verified.userId) {
    throw unauthorized();
  }

  const nextRefreshToken = await signRefreshToken(stored.userId);
  const nextHash = hashToken(nextRefreshToken);

  const nextRecord = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const created = await tx.refreshToken.create({
      data: {
        userId: stored.userId,
        tokenHash: nextHash,
        userAgent: meta.userAgent,
        ipAddress: meta.ip,
        expiresAt: addSeconds(new Date(), env.REFRESH_TOKEN_TTL_SECONDS)
      }
    });

    await tx.refreshToken.update({
      where: { id: stored.id },
      data: {
        revokedAt: new Date(),
        replacedByTokenId: created.id
      }
    });

    return created;
  });

  if (!nextRecord) {
    throw new HttpError(500, "Could not rotate refresh token.", "token_rotation_failed");
  }

  return {
    accessToken: await signAccessToken({
      sub: stored.user.id,
      universityId: stored.user.universityId,
      roles: userRoles(stored.user)
    }),
    refreshToken: nextRefreshToken,
    expiresIn: env.ACCESS_TOKEN_TTL_SECONDS
  };
}

export async function logout(refreshToken: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: {
      tokenHash: hashToken(refreshToken),
      revokedAt: null
    },
    data: { revokedAt: new Date() }
  });
}
