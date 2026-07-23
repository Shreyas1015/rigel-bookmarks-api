/**
 * Provider tests — jwt (access + refresh sign/verify, revocation denylist). Exercises the real
 * jose signing + the ioredis denylist (docker Redis). Covers signAccessToken/verifyAccessToken
 * (valid, revoked, garbage), signRefreshToken/verifyRefreshToken (valid, non-refresh), revokeToken.
 */
import {
  revokeToken,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from '../../../src/providers/auth/jwt.js'
import { redis } from '../../../src/providers/redis.js'
import { newId } from '../../../src/utils/uuid.util.js'

afterAll(() => {
  redis.disconnect()
})

describe('jwt provider', () => {
  it('signs and verifies an access token carrying sub + roles', async () => {
    const uid = newId()
    const token = await signAccessToken(uid, ['user', 'admin'])
    const claims = await verifyAccessToken(token)
    expect(claims.sub).toBe(uid)
    expect(claims.roles).toEqual(['user', 'admin'])
  })

  it('signs and verifies a refresh token (typ = refresh)', async () => {
    const uid = newId()
    const token = await signRefreshToken(uid)
    const claims = await verifyRefreshToken(token)
    expect(claims.sub).toBe(uid)
    expect(claims.typ).toBe('refresh')
  })

  it('rejects an access token passed to verifyRefreshToken (wrong typ)', async () => {
    const access = await signAccessToken(newId(), ['user'])
    await expect(verifyRefreshToken(access)).rejects.toThrow()
  })

  it('rejects a revoked access token (denylist hit)', async () => {
    const token = await signAccessToken(newId(), ['user'])
    const claims = await verifyAccessToken(token)
    await revokeToken(claims.jti as string, 60)
    await expect(verifyAccessToken(token)).rejects.toThrow()
  })

  it('rejects a structurally invalid token', async () => {
    await expect(verifyAccessToken('not.a.jwt')).rejects.toThrow()
  })
})
