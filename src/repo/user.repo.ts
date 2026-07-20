/**
 * User repository (Repo layer — DB access only, every result Zod-validated).
 *
 * A User is the account itself, not a resource owned by another user, so lookups are by
 * primary key / email (no owner scoping) and no cross-user isolation test applies here —
 * the first owned resource arrives with bookmarks (F2).
 */
import { User as UserModel } from '../models/User.model.js'
import { UserSchema, type CreateUserInput, type User } from '../types/user.types.js'

/** Persist a new account (email is unique — a duplicate rejects at the DB unique index). */
export async function create(input: CreateUserInput): Promise<User> {
  const row = await UserModel.create({
    email: input.email,
    passwordHash: input.passwordHash,
    roles: input.roles,
  })
  return UserSchema.parse(row.toJSON())
}

/** Look up a full account row by email (includes the hash — used by login verification). */
export async function findByEmail(email: string): Promise<User | null> {
  const row = await UserModel.findOne({ where: { email } })
  return row ? UserSchema.parse(row.toJSON()) : null
}

/** Look up a full account row by id. */
export async function findById(id: string): Promise<User | null> {
  const row = await UserModel.findByPk(id)
  return row ? UserSchema.parse(row.toJSON()) : null
}
