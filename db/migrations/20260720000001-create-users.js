'use strict'

/**
 * Create the `users` table (SPEC-001 / PLAN-001). Matches src/models/User.model.ts:
 * UUID PK, unique email, argon2 password hash, roles array, timestamps + paranoid deleted_at.
 *
 * The unique email index is created plainly (not CONCURRENTLY): the table is brand-new and
 * empty in this same migration, so there is nothing to lock — CONCURRENTLY is for adding an
 * index to a large, live table.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
      email: { type: Sequelize.STRING, allowNull: false },
      password_hash: { type: Sequelize.STRING, allowNull: false },
      roles: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: false,
        defaultValue: ['user'],
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
      deleted_at: { type: Sequelize.DATE, allowNull: true },
    })
    await queryInterface.addIndex('users', ['email'], {
      unique: true,
      name: 'users_email_unique',
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('users')
  },
}
