import { createHash, randomBytes } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";
import { env } from "../../config/env.js";
import type { Role } from "./permissions.js";

const accessSecret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
const refreshSecret = new TextEncoder().encode(env.JWT_REFRESH_SECRET);

export interface AccessTokenClaims {
  sub: string;
  universityId: string | null;
  roles: Role[];
}

export async function signAccessToken(claims: AccessTokenClaims): Promise<string> {
  return new SignJWT({
    universityId: claims.universityId,
    roles: claims.roles
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(`${env.ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(accessSecret);
}

export async function verifyAccessToken(token: string): Promise<AccessTokenClaims> {
  const { payload } = await jwtVerify(token, accessSecret);
  return {
    sub: String(payload.sub),
    universityId: typeof payload.universityId === "string" ? payload.universityId : null,
    roles: Array.isArray(payload.roles) ? (payload.roles as Role[]) : []
  };
}

export async function signRefreshToken(userId: string): Promise<string> {
  const nonce = randomBytes(32).toString("base64url");
  return new SignJWT({ nonce })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${env.REFRESH_TOKEN_TTL_SECONDS}s`)
    .sign(refreshSecret);
}

export async function verifyRefreshToken(token: string): Promise<{ userId: string }> {
  const { payload } = await jwtVerify(token, refreshSecret);
  return { userId: String(payload.sub) };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
