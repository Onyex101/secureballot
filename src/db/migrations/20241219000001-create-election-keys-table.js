'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create election_keys table
    await queryInterface.createTable('election_keys', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      election_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'elections',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        unique: true, // One key pair per election
      },
      public_key: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      public_key_fingerprint: {
        type: Sequelize.STRING(64),
        allowNull: false,
        unique: true,
      },
      private_key_shares: {
        type: Sequelize.JSONB,
        allowNull: false,
        comment: 'Array of encrypted private key shares using Shamir\'s Secret Sharing',
      },
      key_generated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      key_generated_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'admin_users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Add indexes for performance
    await queryInterface.addIndex('election_keys', ['election_id'], {
      name: 'idx_election_keys_election_id',
    });

    await queryInterface.addIndex('election_keys', ['public_key_fingerprint'], {
      name: 'idx_election_keys_fingerprint',
    });

    await queryInterface.addIndex('election_keys', ['is_active'], {
      name: 'idx_election_keys_active',
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove indexes first
    await queryInterface.removeIndex('election_keys', 'idx_election_keys_election_id');
    await queryInterface.removeIndex('election_keys', 'idx_election_keys_fingerprint');
    await queryInterface.removeIndex('election_keys', 'idx_election_keys_active');

    // Drop the table
    await queryInterface.dropTable('election_keys');
  }
}; 