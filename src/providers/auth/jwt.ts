/**
 * JWT sign / verify + revocation (providers/auth). Uses jose (not jsonwebtoken) and a
 * Redis denylist keyed by the token's `jti` for revocation.
 */
import { SignJWT, jwtVerify, type JWTPayload } from 'jose'
import { env } from '../../config/env.js'
import { newId } from '../../utils/uuid.util.js'
import { redis } from '../redis.js'

const secret = new TextEncoder().encode(env.JWT_SECRET)
const ALG = 'HS256'

export interface AccessTokenClaims extends JWTPayload {
  sub: string
  roles: string[]
}

/** Mint a signed access token carrying the user id (sub) + roles, with a unique jti. */
export async function signAccessToken(userId: string, roles: string[]): Promise<string> {
  return new SignJWT({ roles })
    .setProtectedHeader({ alg: ALG })
    .setSubject(userId)
    .setJti(newId())
    .setIssuedAt()
    .setExpirationTime(`${env.JWT_ACCESS_EXPIRY_SECONDS}s`)
    .sign(secret)
}

/** Verify a token and reject it if it has been revoked. Throws on invalid/expired/revoked. */
export async function verifyAccessToken(token: string): Promise<AccessTokenClaims> {
  const { payload } = await jwtVerify(token, secret)
  if (await isRevoked(payload.jti)) throw new Error('token revoked')
  return payload as AccessTokenClaims
}

/** Add a token's jti to the denylist until its natural expiry. */
export async function revokeToken(jti: string, ttlSeconds: number): Promise<void> {
  await redis.set(`revoked:${jti}`, '1', 'EX', ttlSeconds)
}

async function isRevoked(jti: string | undefined): Promise<boolean> {
  if (!jti) return false
  return (await redis.exists(`revoked:${jti}`)) === 1
}
