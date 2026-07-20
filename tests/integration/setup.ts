/**
 * Integration-test DB/Redis lifecycle + helpers.
 *
 * Imported by integration tests (including the per-feature cross-user isolation tests copied
 * from isolation.test.template.ts). It exposes the helpers that template references:
 *   - createUser(email)      → seed a user, returns { id, email, token }
 *   - authTokenFor(userId)   → signed access token for an existing user id
 *   - resetDb()              → truncate all tables (also run automatically before each test)
 *
 * Lifecycle:
 *   - beforeAll:  authenticate + sync the schema against the test database
 *   - beforeEach: truncate all tables so tests are order-independent
 *   - afterAll:   close DB + Redis connections
 *
 * NOTE: createUser mints an id + token today; once a product adds a User model + repo it
 * should also persist the row (the model layer does not exist in a bare Phase 0 scaffold).
 */
import { sequelize } from '../../src/models/index.js'
import { redis } from '../../src/providers/redis.js'
import { signAccessToken } from '../../src/providers/auth/jwt.js'
import { newId } from '../../src/utils/uuid.util.js'

export interface SeededUser {
  id: string
  email: string
  token: string
}

beforeAll(async () => {
  await sequelize.authenticate()
  await sequelize.sync({ force: true })
})

beforeEach(async () => {
  await resetDb()
})

afterAll(async () => {
  await sequelize.close()
  redis.disconnect()
})

/** Truncate every table so each test starts from a clean slate. */
export async function resetDb(): Promise<void> {
  await sequelize.truncate({ cascade: true, restartIdentity: true })
}

/** Sign an access token for an existing user id (roles default to ['user']). */
export async function authTokenFor(userId: string, roles: string[] = ['user']): Promise<string> {
  return signAccessToken(userId, roles)
}

/** Seed a user and return its id, email, and a signed access token. */
export async function createUser(email: string, roles: string[] = ['user']): Promise<SeededUser> {
  const id = newId()
  const token = await authTokenFor(id, roles)
  return { id, email, token }
}
