/**
 * User Sequelize model (Models layer — schema only, no logic). Soft-deleted (`paranoid`),
 * UUIDv7 primary key, unique email. Column names are snake_cased (`underscored`); `.toJSON()`
 * still returns the camelCase attribute names the repo's `UserSchema` validates.
 */
import {
  AllowNull,
  Column,
  DataType,
  Default,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript'
import { newId } from '../utils/uuid.util.js'

@Table({
  tableName: 'users',
  paranoid: true,
  underscored: true,
  indexes: [{ name: 'users_email_unique', unique: true, fields: ['email'] }],
})
export class User extends Model {
  @PrimaryKey
  @Default(() => newId())
  @Column(DataType.UUID)
  declare id: string

  @AllowNull(false)
  @Column(DataType.STRING)
  declare email: string

  @AllowNull(false)
  @Column(DataType.STRING)
  declare passwordHash: string

  @AllowNull(false)
  @Default(['user'])
  @Column(DataType.ARRAY(DataType.STRING))
  declare roles: string[]
}
