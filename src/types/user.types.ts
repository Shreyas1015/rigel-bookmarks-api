/**
 * User domain types + Zod schemas (Types layer — zero imports from other layers).
 * `UserSchema` is the DB-row shape the repo validates every result against; `PublicUser`
 * is the safe projection the API returns (never carries the password hash).
 */
import { z } from 'zod'

/** Roles are free-form strings; new accounts default to ['user']. */
export type UserRole = string

/** Full persisted user row (shape of `User.model` `.toJSON()`). */
export const UserSchema = z.object({
  id: z.string(),
  email: z.string(),
  passwordHash: z.string(),
  roles: z.array(z.string()),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
})
export type User = z.infer<typeof UserSchema>

/** Safe projection returned to clients — no passwordHash, no internal timestamps. */
export const PublicUserSchema = UserSchema.pick({
  id: true,
  email: true,
  roles: true,
  createdAt: true,
})
export type PublicUser = z.infer<typeof PublicUserSchema>

/** Fields required to persist a new user (passwordHash already computed by the service). */
export interface CreateUserInput {
  email: string
  passwordHash: string
  roles: UserRole[]
}
