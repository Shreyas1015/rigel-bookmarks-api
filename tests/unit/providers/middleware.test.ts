/**
 * Provider tests — requireAuth middleware. Drives the middleware with lightweight req/res doubles
 * (no HTTP server needed). Covers: valid Bearer token → req.auth set + next(); missing header →
 * 401; non-Bearer scheme → 401; invalid token → 401 (catch). Also exercises the requestId
 * fallbacks (req.requestId → x-request-id header → '').
 */
import type { NextFunction, Request, Response } from 'express'
import { requireAuth } from '../../../src/providers/auth/middleware.js'
import { signAccessToken } from '../../../src/providers/auth/jwt.js'
import { redis } from '../../../src/providers/redis.js'
import { newId } from '../../../src/utils/uuid.util.js'

afterAll(() => {
  redis.disconnect()
})

interface Captured {
  statusCode: number
  body: unknown
  nexted: boolean
}

function drive(
  headers: Record<string, string>,
  requestId?: string
): {
  run: () => Promise<void>
  req: Request
  captured: Captured
} {
  const captured: Captured = { statusCode: 0, body: undefined, nexted: false }
  const req = {
    header: (name: string): string | undefined => headers[name.toLowerCase()],
    requestId,
  } as unknown as Request
  const res = {
    status(code: number): Response {
      captured.statusCode = code
      return res
    },
    json(payload: unknown): Response {
      captured.body = payload
      return res
    },
  } as unknown as Response
  const next: NextFunction = () => {
    captured.nexted = true
  }
  return { run: () => requireAuth(req, res, next), req, captured }
}

describe('requireAuth', () => {
  it('sets req.auth and calls next() for a valid Bearer token', async () => {
    const uid = newId()
    const token = await signAccessToken(uid, ['user'])
    const { run, req, captured } = drive({ authorization: `Bearer ${token}` }, 'req-1')
    await run()
    expect(captured.nexted).toBe(true)
    expect(req.auth?.sub).toBe(uid)
    expect(captured.statusCode).toBe(0)
  })

  it('responds 401 when the Authorization header is missing (falls back to empty requestId)', async () => {
    const { run, captured } = drive({})
    await run()
    expect(captured.statusCode).toBe(401)
    expect(captured.nexted).toBe(false)
  })

  it('responds 401 for a non-Bearer scheme (uses x-request-id fallback)', async () => {
    const { run, captured } = drive({ authorization: 'Basic abc', 'x-request-id': 'xrid' })
    await run()
    expect(captured.statusCode).toBe(401)
  })

  it('responds 401 for a structurally invalid token (catch branch)', async () => {
    const { run, captured } = drive({ authorization: 'Bearer not.a.jwt' }, 'req-2')
    await run()
    expect(captured.statusCode).toBe(401)
    expect(captured.nexted).toBe(false)
  })
})
