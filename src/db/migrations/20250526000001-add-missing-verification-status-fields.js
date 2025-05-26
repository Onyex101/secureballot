'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Helper function to check if a column exists
    const columnExists = async (tableName, columnName) => {
      try {
        const query = `
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = '${tableName}' 
          AND column_name = '${columnName}'
        `;
        const [results] = await queryInterface.sequelize.query(query);
        return results.length > 0;
      } catch (error) {
        console.error(`Error checking if column ${columnName} exists:`, error);
        return false;
      }
    };

    // Add columns only if they don't exist
    const addColumnIfNotExists = async (tableName, columnName, columnDefinition) => {
      if (!(await columnExists(tableName, columnName))) {
        console.log(`Adding column ${columnName} to ${tableName}...`);
        await queryInterface.addColumn(tableName, columnName, columnDefinition);
      } else {
        console.log(`Column ${columnName} already exists in ${tableName}, skipping...`);
      }
    };

    // Add missing columns to verification_statuses table
    await addColumnIfNotExists('verification_statuses', 'is_verified', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    await addColumnIfNotExists('verification_statuses', 'state', {
      type: Sequelize.STRING(50),
      allowNull: false,
      defaultValue: 'pending',
    });

    await addColumnIfNotExists('verification_statuses', 'verified_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await addColumnIfNotExists('verification_statuses', 'verification_method', {
      type: Sequelize.STRING(50),
      allowNull: false,
      defaultValue: 'manual',
    });

    await addColumnIfNotExists('verification_statuses', 'verification_data', {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: {},
    });

    // Update existing records with default values
    try {
      await queryInterface.sequelize.query(`
        UPDATE verification_statuses SET 
          is_verified = COALESCE(is_verified, FALSE),
          state = COALESCE(state, 'pending'),
          verification_method = COALESCE(verification_method, 'manual'),
          verification_data = COALESCE(verification_data, '{}')
        WHERE is_verified IS NULL OR state IS NULL OR verification_method IS NULL OR verification_data IS NULL
      `);
      console.log('Updated existing verification_statuses records with default values');
    } catch (error) {
      console.error('Error updating existing records:', error);
    }

    // Add indexes for performance
    try {
      const indexExists = await queryInterface.sequelize.query(
        `SELECT indexname FROM pg_indexes WHERE tablename = 'verification_statuses' AND indexname = 'idx_verification_statuses_state'`
      );
      
      if (indexExists[0].length === 0) {
        await queryInterface.addIndex('verification_statuses', ['state'], {
          name: 'idx_verification_statuses_state'
        });
        console.log('Added index on verification_statuses.state');
      } else {
        console.log('Index idx_verification_statuses_state already exists, skipping...');
      }
    } catch (error) {
      console.error('Error adding state index:', error);
    }

    try {
      const indexExists = await queryInterface.sequelize.query(
        `SELECT indexname FROM pg_indexes WHERE tablename = 'verification_statuses' AND indexname = 'idx_verification_statuses_is_verified'`
      );
      
      if (indexExists[0].length === 0) {
        await queryInterface.addIndex('verification_statuses', ['is_verified'], {
          name: 'idx_verification_statuses_is_verified'
        });
        console.log('Added index on verification_statuses.is_verified');
      } else {
        console.log('Index idx_verification_statuses_is_verified already exists, skipping...');
      }
    } catch (error) {
      console.error('Error adding is_verified index:', error);
    }
  },

  async down(queryInterface, Sequelize) {
    // Helper function to check if a column exists
    const columnExists = async (tableName, columnName) => {
      try {
        const query = `
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = '${tableName}' 
          AND column_name = '${columnName}'
        `;
        const [results] = await queryInterface.sequelize.query(query);
        return results.length > 0;
      } catch (error) {
        console.error(`Error checking if column ${columnName} exists:`, error);
        return false;
      }
    };

    // Remove indexes first
    try {
      await queryInterface.removeIndex('verification_statuses', 'idx_verification_statuses_state');
    } catch (error) {
      console.log('Index idx_verification_statuses_state may not exist, skipping removal');
    }

    try {
      await queryInterface.removeIndex('verification_statuses', 'idx_verification_statuses_is_verified');
    } catch (error) {
      console.log('Index idx_verification_statuses_is_verified may not exist, skipping removal');
    }

    // Remove the added columns if they exist
    const columnsToRemove = ['is_verified', 'state', 'verified_at', 'verification_method', 'verification_data'];
    for (const column of columnsToRemove) {
      if (await columnExists('verification_statuses', column)) {
        try {
          await queryInterface.removeColumn('verification_statuses', column);
          console.log(`Removed column ${column} from verification_statuses`);
        } catch (error) {
          console.error(`Error removing column ${column}:`, error);
        }
      }
    }
  }
}; 