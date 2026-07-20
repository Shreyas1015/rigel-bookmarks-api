/**
 * Sequelize instance with pool config + statement timeout (config layer).
 * Models are NOT registered here — that would import the Models layer into Config
 * (a boundary violation). Registration happens in `src/models/index.ts` via
 * `sequelize.addModels([...])` (the only legal `models → config` edge).
 */
import { Sequelize } from 'sequelize-typescript'
import { env } from './env.js'
import { DB_QUERY_MS } from './timeouts.js'

export const sequelize = new Sequelize(env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  pool: {
    max: env.DATABASE_POOL_MAX,
    min: env.DATABASE_POOL_MIN,
    acquire: 30000,
    idle: 10000,
  },
  dialectOptions: {
    statement_timeout: DB_QUERY_MS,
  },
})
