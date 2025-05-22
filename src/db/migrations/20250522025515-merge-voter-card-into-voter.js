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

    // Add the columns from VoterCard to Voter table
    await addColumnIfNotExists('voters', 'full_name', {
      type: Sequelize.STRING(100),
      allowNull: true,
    });

    await addColumnIfNotExists('voters', 'polling_unit_code', {
      type: Sequelize.STRING(50),
      allowNull: true,
    });

    await addColumnIfNotExists('voters', 'state', {
      type: Sequelize.STRING(50),
      allowNull: true,
    });

    await addColumnIfNotExists('voters', 'gender', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: 'male',
    });

    await addColumnIfNotExists('voters', 'lga', {
      type: Sequelize.STRING(50),
      allowNull: true,
    });

    await addColumnIfNotExists('voters', 'ward', {
      type: Sequelize.STRING(100),
      allowNull: true,
    });

    // Add a check constraint for gender if it doesn't exist
    try {
      const constraintExists = await queryInterface.sequelize.query(
        `SELECT constraint_name 
         FROM information_schema.table_constraints 
         WHERE table_name = 'voters' 
         AND constraint_name = 'check_voter_gender'`
      );
      
      if (constraintExists[0].length === 0) {
        await queryInterface.addConstraint('voters', {
          fields: ['gender'],
          type: 'check',
          where: {
            gender: ['male', 'female']
          },
          name: 'check_voter_gender'
        });
      } else {
        console.log(`Constraint check_voter_gender already exists, skipping...`);
      }
    } catch (error) {
      console.error(`Error checking or adding constraint:`, error);
    }

    // Check if voter_cards table exists before trying to drop it
    try {
      const tableExists = await queryInterface.sequelize.query(
        `SELECT EXISTS (
           SELECT FROM information_schema.tables 
           WHERE table_schema = 'public' 
           AND table_name = 'voter_cards'
         )`
      );
      
      if (tableExists[0][0].exists) {
        // Drop voter_cards table
        await queryInterface.dropTable('voter_cards');
        console.log('Voter cards table has been dropped');
      } else {
        console.log('Voter cards table does not exist, skipping drop operation');
      }
    } catch (error) {
      console.error(`Error checking or dropping voter_cards table:`, error);
    }

    // Check if columns exist before trying to change them
    const columnsToCheck = ['full_name', 'polling_unit_code', 'state', 'gender', 'lga', 'ward'];
    for (const column of columnsToCheck) {
      if (await columnExists('voters', column)) {
        try {
          // Change nullable fields to required
          await queryInterface.changeColumn('voters', column, {
            type: column === 'gender' ? Sequelize.STRING : Sequelize.STRING(column === 'ward' || column === 'full_name' ? 100 : 50),
            allowNull: false,
            defaultValue: column === 'gender' ? 'male' : undefined,
          });
        } catch (error) {
          console.error(`Error modifying column ${column}:`, error);
        }
      }
    }

    // Add indexes if they don't exist
    try {
      const indexExists = await queryInterface.sequelize.query(
        `SELECT indexname FROM pg_indexes WHERE tablename = 'voters' AND indexname = 'voters_polling_unit_code_idx'`
      );
      
      if (indexExists[0].length === 0) {
        await queryInterface.addIndex('voters', ['polling_unit_code'], {
          name: 'voters_polling_unit_code_idx'
        });
      } else {
        console.log(`Index voters_polling_unit_code_idx already exists, skipping...`);
      }
    } catch (error) {
      console.error(`Error checking or adding polling unit code index:`, error);
    }

    try {
      const indexExists = await queryInterface.sequelize.query(
        `SELECT indexname FROM pg_indexes WHERE tablename = 'voters' AND indexname = 'voters_location_idx'`
      );
      
      if (indexExists[0].length === 0) {
        await queryInterface.addIndex('voters', ['state', 'lga', 'ward'], {
          name: 'voters_location_idx'
        });
      } else {
        console.log(`Index voters_location_idx already exists, skipping...`);
      }
    } catch (error) {
      console.error(`Error checking or adding location index:`, error);
    }
  },

  async down(queryInterface, Sequelize) {
    // Create voter_cards table again if it doesn't exist
    try {
      const tableExists = await queryInterface.sequelize.query(
        `SELECT EXISTS (
           SELECT FROM information_schema.tables 
           WHERE table_schema = 'public' 
           AND table_name = 'voter_cards'
         )`
      );
      
      if (!tableExists[0][0].exists) {
        await queryInterface.createTable('voter_cards', {
          id: {
            type: Sequelize.UUID,
            primaryKey: true,
            defaultValue: Sequelize.UUIDV4
          },
          user_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: 'voters',
              key: 'id'
            },
            onDelete: 'CASCADE'
          },
          full_name: {
            type: Sequelize.STRING(100),
            allowNull: false
          },
          polling_unit_code: {
            type: Sequelize.STRING(50),
            allowNull: false
          },
          state: {
            type: Sequelize.STRING(50),
            allowNull: false
          },
          gender: {
            type: Sequelize.STRING,
            allowNull: false,
            defaultValue: 'male'
          },
          lga: {
            type: Sequelize.STRING(50),
            allowNull: false
          },
          ward: {
            type: Sequelize.STRING(100),
            allowNull: false
          },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
          },
          updated_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
          }
        });

        // Add back the indexes that would have been on voter_cards
        await queryInterface.addIndex('voter_cards', ['polling_unit_code']);
        await queryInterface.addIndex('voter_cards', ['state', 'lga', 'ward']);
      }
    } catch (error) {
      console.error(`Error checking or creating voter_cards table:`, error);
    }

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

    // Remove constraints and indexes if they exist
    try {
      await queryInterface.removeConstraint('voters', 'check_voter_gender');
    } catch (error) {
      console.log('Constraint check_voter_gender may not exist, skipping removal');
    }

    try {
      await queryInterface.removeIndex('voters', 'voters_polling_unit_code_idx');
    } catch (error) {
      console.log('Index voters_polling_unit_code_idx may not exist, skipping removal');
    }

    try {
      await queryInterface.removeIndex('voters', 'voters_location_idx');
    } catch (error) {
      console.log('Index voters_location_idx may not exist, skipping removal');
    }
    
    // Remove the added columns from Voter table if they exist
    const columnsToRemove = ['full_name', 'polling_unit_code', 'state', 'gender', 'lga', 'ward'];
    for (const column of columnsToRemove) {
      if (await columnExists('voters', column)) {
        try {
          await queryInterface.removeColumn('voters', column);
        } catch (error) {
          console.error(`Error removing column ${column}:`, error);
        }
      }
    }
  }
};
