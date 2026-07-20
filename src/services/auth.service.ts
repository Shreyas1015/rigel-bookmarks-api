/**
 * Auth service (Service layer — business logic; no express/HTTP, no provider imports).
 *
 * Owns password hashing (argon2) and account persistence, and returns domain `PublicUser`
 * values (never the hash). JWT minting lives in the Runtime layer (the composition root wires
 * providers), so this stays HTTP- and token-agnostic. Every boundary emits a span + a log.
 */
import * as argon2 from 'argon2'
import { DEFAULT_USER_ROLES } from '../config/constants.js'
import { logger } from '../config/logger.js'
import { withSpan } from '../config/tracing.js'
import * as userRepo from '../repo/user.repo.js'
import type { LoginInput, RegisterInput } from '../types/auth.types.js'
import { PublicUserSchema, type PublicUser } from '../types/user.types.js'
import { ConflictError, NotFoundError, UnauthorizedError } from '../utils/errors.util.js'

/** Create an account: reject a duplicate email, argon2-hash the password, persist, project safe. */
export async function register(input: RegisterInput): Promise<PublicUser> {
  return withSpan('auth.register', {}, async () => {
    const start = Date.now()
    const existing = await userRepo.findByEmail(input.email)
    if (existing) throw new ConflictError('Email already registered')

    // argon2's shipped types declare hash() as `Promise<any>` (their overloads collapse in the
    // generated .d.cts); the encoded (non-raw) hash is a string. Type it at the boundary so the
    // rest of the service stays type-safe under `no-unsafe-assignment`.
    const passwordHash = (await argon2.hash(input.password)) as string
    const user = await userRepo.create({
      email: input.email,
      passwordHash,
      roles: [...DEFAULT_USER_ROLES],
    })

    logger.info({ event: 'auth.register', userId: user.id, durationMs: Date.now() - start })
    return PublicUserSchema.parse(user)
  })
}

/** Verify credentials. A missing account and a wrong password are the same 401 (no user enumeration). */
export async function login(input: LoginInput): Promise<PublicUser> {
  return withSpan('auth.login', {}, async () => {
    const start = Date.now()
    const user = await userRepo.findByEmail(input.email)
    if (!user) throw new UnauthorizedError('Invalid email or password')

    const valid = await argon2.verify(user.passwordHash, input.password)
    if (!valid) throw new UnauthorizedError('Invalid email or password')

    logger.info({ event: 'auth.login', userId: user.id, durationMs: Date.now() - start })
    return PublicUserSchema.parse(user)
  })
}

/** Load the authenticated caller's own account (used by GET /me and by /refresh). */
export async function getById(id: string): Promise<PublicUser> {
  const user = await userRepo.findById(id)
  if (!user) throw new NotFoundError('User not found')

  logger.info({ event: 'auth.profile', userId: user.id })
  return PublicUserSchema.parse(user)
}
