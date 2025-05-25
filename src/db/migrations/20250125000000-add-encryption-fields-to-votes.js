'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add new encryption fields to votes table
    await queryInterface.addColumn('votes', 'encrypted_aes_key', {
      type: Sequelize.TEXT,
      allowNull: true, // Allow null initially for existing records
    });

    await queryInterface.addColumn('votes', 'iv', {
      type: Sequelize.STRING(32),
      allowNull: true, // Allow null initially for existing records
    });

    await queryInterface.addColumn('votes', 'public_key_fingerprint', {
      type: Sequelize.STRING(16),
      allowNull: true, // Allow null initially for existing records
    });

    // Update existing records with placeholder values if any exist
    await queryInterface.sequelize.query(`
      UPDATE votes 
      SET 
        encrypted_aes_key = 'MIGRATION_PLACEHOLDER',
        iv = 'MIGRATION_PLACEHOLDER',
        public_key_fingerprint = 'MIGRATION_PLACEHOLDER'
      WHERE 
        encrypted_aes_key IS NULL 
        OR iv IS NULL 
        OR public_key_fingerprint IS NULL
    `);

    // Now make the columns NOT NULL
    await queryInterface.changeColumn('votes', 'encrypted_aes_key', {
      type: Sequelize.TEXT,
      allowNull: false,
    });

    await queryInterface.changeColumn('votes', 'iv', {
      type: Sequelize.STRING(32),
      allowNull: false,
    });

    await queryInterface.changeColumn('votes', 'public_key_fingerprint', {
      type: Sequelize.STRING(16),
      allowNull: false,
    });

    // Add indexes for performance
    await queryInterface.addIndex('votes', ['public_key_fingerprint'], {
      name: 'idx_votes_public_key_fingerprint',
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove the indexes first
    await queryInterface.removeIndex('votes', 'idx_votes_public_key_fingerprint');

    // Remove the columns
    await queryInterface.removeColumn('votes', 'encrypted_aes_key');
    await queryInterface.removeColumn('votes', 'iv');
    await queryInterface.removeColumn('votes', 'public_key_fingerprint');
  }
}; 