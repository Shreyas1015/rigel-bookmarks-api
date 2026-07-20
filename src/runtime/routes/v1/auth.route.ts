/**
 * Auth routes (Runtime layer). Handler order every time: rate-limit -> validate -> service ->
 * mint tokens -> respond -> next(err). Token minting lives here (the composition root wires
 * providers); the service stays HTTP/token-agnostic.
 *
 *   POST /api/v1/auth/register  201  { accessToken, user } + httpOnly refresh cookie
 *   POST /api/v1/auth/login     200  { accessToken, user } + httpOnly refresh cookie
 *   POST /api/v1/auth/refresh   200  new { accessToken, user } from the refresh cookie
 *   GET  /api/v1/auth/me        200  the authenticated caller (requireAuth)
 */
import { Router, type Response } from 'express'
import { REFRESH_COOKIE_NAME } from '../../../config/constants.js'
import { env } from '../../../config/env.js'
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../../providers/auth/jwt.js'
import { requireAuth } from '../../../providers/auth/middleware.js'
import * as authService from '../../../services/auth.service.js'
import { LoginSchema, RegisterSchema, type AuthResponse } from '../../../types/auth.types.js'
import { parseCookies } from '../../../utils/cookie.util.js'
import { UnauthorizedError } from '../../../utils/errors.util.js'
import { ok } from '../../../utils/response.util.js'
import { authLimiter } from '../../middleware/rateLimiter.js'

export const authRouter: Router = Router()

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/api/v1/auth',
  maxAge: env.JWT_REFRESH_EXPIRY_SECONDS * 1000,
}

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE_NAME, token, REFRESH_COOKIE_OPTIONS)
}

authRouter.post('/register', authLimiter, async (req, res, next) => {
  try {
    const body = RegisterSchema.parse(req.body)
    const user = await authService.register(body)
    const accessToken = await signAccessToken(user.id, user.roles)
    setRefreshCookie(res, await signRefreshToken(user.id))
    const data: AuthResponse = { accessToken, user }
    res.status(201).json(ok(data, req.requestId ?? ''))
  } catch (err) {
    next(err)
  }
})

authRouter.post('/login', authLimiter, async (req, res, next) => {
  try {
    const body = LoginSchema.parse(req.body)
    const user = await authService.login(body)
    const accessToken = await signAccessToken(user.id, user.roles)
    setRefreshCookie(res, await signRefreshToken(user.id))
    const data: AuthResponse = { accessToken, user }
    res.status(200).json(ok(data, req.requestId ?? ''))
  } catch (err) {
    next(err)
  }
})

authRouter.post('/refresh', authLimiter, async (req, res, next) => {
  try {
    const token = parseCookies(req.header('cookie'))[REFRESH_COOKIE_NAME]
    if (!token) throw new UnauthorizedError('Missing refresh token')
    let sub: string
    try {
      sub = (await verifyRefreshToken(token)).sub
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token')
    }
    const user = await authService.getById(sub)
    const accessToken = await signAccessToken(user.id, user.roles)
    setRefreshCookie(res, await signRefreshToken(user.id))
    const data: AuthResponse = { accessToken, user }
    res.status(200).json(ok(data, req.requestId ?? ''))
  } catch (err) {
    next(err)
  }
})

authRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await authService.getById(req.auth?.sub ?? '')
    res.status(200).json(ok(user, req.requestId ?? ''))
  } catch (err) {
    next(err)
  }
})
