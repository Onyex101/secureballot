'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add public_key_fingerprint column to elections table
    await queryInterface.addColumn('elections', 'public_key_fingerprint', {
      type: Sequelize.STRING(16),
      allowNull: true,
    });

    // Add index for performance
    await queryInterface.addIndex('elections', ['public_key_fingerprint'], {
      name: 'idx_elections_public_key_fingerprint',
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove the index first
    await queryInterface.removeIndex('elections', 'idx_elections_public_key_fingerprint');

    // Remove the column
    await queryInterface.removeColumn('elections', 'public_key_fingerprint');
  }
}; 