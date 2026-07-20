/**
 * Auth request/response types + Zod schemas (Types layer — zero imports from other layers).
 * Request schemas are parsed at the route boundary; a parse failure becomes 400 VALIDATION_ERROR.
 */
import { z } from 'zod'
import type { PublicUser } from './user.types.js'

export const RegisterSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
})
export type RegisterInput = z.infer<typeof RegisterSchema>

export const LoginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
})
export type LoginInput = z.infer<typeof LoginSchema>

/** The `data` payload of a successful register/login/refresh response. */
export interface AuthResponse {
  accessToken: string
  user: PublicUser
}
