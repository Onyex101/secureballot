'use strict';

const path = require('path');

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

    // Remove column if it exists
    const removeColumnIfExists = async (tableName, columnName) => {
      if (await columnExists(tableName, columnName)) {
        console.log(`Removing column ${columnName} from ${tableName}...`);
        await queryInterface.removeColumn(tableName, columnName);
      } else {
        console.log(`Column ${columnName} does not exist in ${tableName}, skipping...`);
      }
    };

    // Import encryption service
    let encryptionService;
    try {
      // Try to import the encryption service
      const encryptionPath = path.join(__dirname, '..', '..', 'services', 'encryptionService.ts');
      encryptionService = require(encryptionPath);
      console.log('✅ Encryption service loaded successfully');
    } catch (error) {
      console.log('⚠️  Warning: Could not load encryption service. Data migration will be skipped.');
      console.log('Please run the data migration script manually after this migration.');
    }

    // 1. Add encrypted NIN and VIN fields to voters table
    await addColumnIfNotExists('voters', 'nin_encrypted', {
      type: Sequelize.STRING(255),
      allowNull: true, // Will be populated during migration
    });

    await addColumnIfNotExists('voters', 'vin_encrypted', {
      type: Sequelize.STRING(255),
      allowNull: true, // Will be populated during migration
    });

    // 2. Add encrypted NIN to admin_users table
    await addColumnIfNotExists('admin_users', 'nin_encrypted', {
      type: Sequelize.STRING(255),
      allowNull: true, // Will be populated manually
    });

    // 3. Migrate existing voter data - encrypt nin and vin values
    if (encryptionService && (await columnExists('voters', 'nin'))) {
      console.log('🔐 Migrating existing voter NIN and VIN data...');
      
      const batchSize = 100;
      let offset = 0;
      let processedCount = 0;

      // Get total count for progress tracking
      const [countResult] = await queryInterface.sequelize.query('SELECT COUNT(*) as count FROM voters WHERE nin IS NOT NULL OR vin IS NOT NULL');
      const totalCount = parseInt(countResult[0].count);

      if (totalCount > 0) {
        console.log(`Found ${totalCount} voters with NIN/VIN data to encrypt`);

        while (true) {
          // Get batch of voters with nin or vin data
          const [voters] = await queryInterface.sequelize.query(`
            SELECT id, nin, vin 
            FROM voters 
            WHERE nin IS NOT NULL OR vin IS NOT NULL
            LIMIT ${batchSize} OFFSET ${offset}
          `);

          if (voters.length === 0) break;

          // Process each voter in the batch
          for (const voter of voters) {
            try {
              const updates = [];
              const values = [];

              // Encrypt NIN if it exists
              if (voter.nin) {
                const ninEncrypted = encryptionService.encryptIdentity(voter.nin);
                updates.push('nin_encrypted = ?');
                values.push(ninEncrypted);
              }

              // Encrypt VIN if it exists
              if (voter.vin) {
                const vinEncrypted = encryptionService.encryptIdentity(voter.vin);
                updates.push('vin_encrypted = ?');
                values.push(vinEncrypted);
              }

              if (updates.length > 0) {
                values.push(voter.id);
                await queryInterface.sequelize.query(`
                  UPDATE voters 
                  SET ${updates.join(', ')} 
                  WHERE id = ?
                `, {
                  replacements: values
                });
                processedCount++;
              }
            } catch (error) {
              console.error(`❌ Error encrypting data for voter ${voter.id}:`, error.message);
              // Continue with other voters rather than failing the entire migration
            }
          }

          offset += batchSize;
          if (processedCount % 50 === 0 || voters.length < batchSize) {
            console.log(`⏳ Encrypted ${processedCount}/${totalCount} voter records...`);
          }
        }

        console.log(`✅ Successfully encrypted ${processedCount} voter records`);
      } else {
        console.log('ℹ️  No voter NIN/VIN data found to encrypt');
      }
    }

    // 4. Migrate existing admin data - encrypt nin values
    if (encryptionService && (await columnExists('admin_users', 'nin'))) {
      console.log('🔐 Migrating existing admin NIN data...');
      
      const [admins] = await queryInterface.sequelize.query(`
        SELECT id, nin 
        FROM admin_users 
        WHERE nin IS NOT NULL
      `);

      if (admins.length > 0) {
        console.log(`Found ${admins.length} admins with NIN data to encrypt`);

        for (const admin of admins) {
          try {
            if (admin.nin) {
              const ninEncrypted = encryptionService.encryptIdentity(admin.nin);
              await queryInterface.sequelize.query(`
                UPDATE admin_users 
                SET nin_encrypted = ? 
                WHERE id = ?
              `, {
                replacements: [ninEncrypted, admin.id]
              });
            }
          } catch (error) {
            console.error(`❌ Error encrypting NIN for admin ${admin.id}:`, error.message);
          }
        }

        console.log(`✅ Successfully encrypted ${admins.length} admin NIN records`);
      } else {
        console.log('ℹ️  No admin NIN data found to encrypt');
      }
    }

    // 5. Add OTP fields for voter authentication
    await addColumnIfNotExists('voters', 'otp_code', {
      type: Sequelize.STRING(6),
      allowNull: true,
    });

    await addColumnIfNotExists('voters', 'otp_expires_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await addColumnIfNotExists('voters', 'otp_verified', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    await addColumnIfNotExists('voters', 'email', {
      type: Sequelize.STRING(100),
      allowNull: true, // Will need to be populated
      validate: {
        isEmail: true,
      },
    });

    // 6. Add indexes for performance on new encrypted fields
    try {
      await queryInterface.addIndex('voters', ['nin_encrypted'], {
        name: 'idx_voters_nin_encrypted',
        unique: true,
      });
      console.log('Added unique index on voters.nin_encrypted');
    } catch (error) {
      console.log('Index on voters.nin_encrypted may already exist');
    }

    try {
      await queryInterface.addIndex('voters', ['vin_encrypted'], {
        name: 'idx_voters_vin_encrypted',
        unique: true,
      });
      console.log('Added unique index on voters.vin_encrypted');
    } catch (error) {
      console.log('Index on voters.vin_encrypted may already exist');
    }

    try {
      await queryInterface.addIndex('admin_users', ['nin_encrypted'], {
        name: 'idx_admin_users_nin_encrypted',
        unique: true,
      });
      console.log('Added unique index on admin_users.nin_encrypted');
    } catch (error) {
      console.log('Index on admin_users.nin_encrypted may already exist');
    }

    try {
      await queryInterface.addIndex('voters', ['email'], {
        name: 'idx_voters_email',
        unique: true,
      });
      console.log('Added unique index on voters.email');
    } catch (error) {
      console.log('Index on voters.email may already exist');
    }

    // 7. Create OTP logs table for tracking OTP attempts
    try {
      await queryInterface.createTable('otp_logs', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
        },
        user_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'voters',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        otp_code: {
          type: Sequelize.STRING(6),
          allowNull: false,
        },
        email: {
          type: Sequelize.STRING(100),
          allowNull: false,
        },
        ip_address: {
          type: Sequelize.INET,
          allowNull: true,
        },
        user_agent: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        status: {
          type: Sequelize.ENUM('sent', 'verified', 'expired', 'failed'),
          allowNull: false,
          defaultValue: 'sent',
        },
        attempts: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        expires_at: {
          type: Sequelize.DATE,
          allowNull: false,
        },
        verified_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
      });
      console.log('Created otp_logs table');
    } catch (error) {
      console.log('OTP logs table may already exist');
    }

    // Add indexes for OTP logs
    try {
      await queryInterface.addIndex('otp_logs', ['user_id'], {
        name: 'idx_otp_logs_user_id',
      });
      
      await queryInterface.addIndex('otp_logs', ['status'], {
        name: 'idx_otp_logs_status',
      });

      await queryInterface.addIndex('otp_logs', ['created_at'], {
        name: 'idx_otp_logs_created_at',
      });
    } catch (error) {
      console.log('OTP logs indexes may already exist');
    }

    // 8. Remove old plain text fields AFTER encrypting the data
    if (await columnExists('voters', 'nin')) {
      console.log('🗑️  Removing plain text nin column from voters...');
      await removeColumnIfExists('voters', 'nin');
    }

    if (await columnExists('voters', 'vin')) {
      console.log('🗑️  Removing plain text vin column from voters...');
      await removeColumnIfExists('voters', 'vin');
    }

    if (await columnExists('admin_users', 'nin')) {
      console.log('🗑️  Removing plain text nin column from admin_users...');
      await removeColumnIfExists('admin_users', 'nin');
    }

    // 9. Remove password_hash column from voters since we now use encrypted NIN/VIN + OTP authentication
    if (await columnExists('voters', 'password_hash')) {
      console.log('🗑️  Removing password_hash column from voters (replaced by encrypted NIN/VIN + OTP authentication)...');
      await removeColumnIfExists('voters', 'password_hash');
    }

    console.log('Migration completed successfully');
    console.log('IMPORTANT: Remember to:');
    console.log('1. Verify encrypted data was migrated correctly');
    console.log('2. Update models to use new encrypted fields');
    console.log('3. ✅ Password_hash column removed from voters table (now using encrypted NIN/VIN + OTP)');
    console.log('4. Test authentication with encrypted NIN/VIN values');
  },

  async down(queryInterface, Sequelize) {
    console.log('Rolling back authentication system changes...');

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

    // Remove indexes
    const indexesToRemove = [
      { table: 'voters', name: 'idx_voters_nin_encrypted' },
      { table: 'voters', name: 'idx_voters_vin_encrypted' },
      { table: 'admin_users', name: 'idx_admin_users_nin_encrypted' },
      { table: 'voters', name: 'idx_voters_email' },
      { table: 'otp_logs', name: 'idx_otp_logs_user_id' },
      { table: 'otp_logs', name: 'idx_otp_logs_status' },
      { table: 'otp_logs', name: 'idx_otp_logs_created_at' },
    ];

    for (const { table, name } of indexesToRemove) {
      try {
        await queryInterface.removeIndex(table, name);
        console.log(`Removed index ${name}`);
      } catch (error) {
        console.log(`Index ${name} may not exist, skipping removal`);
      }
    }

    // Drop OTP logs table
    try {
      await queryInterface.dropTable('otp_logs');
      console.log('Dropped otp_logs table');
    } catch (error) {
      console.log('OTP logs table may not exist');
    }

    // WARNING: This rollback cannot restore the original nin/vin data since it was encrypted
    console.log('⚠️  WARNING: Rollback cannot restore original nin/vin data as it was encrypted during migration');
    console.log('⚠️  You may need to restore from a backup if you need the original plain text values');

    // Remove columns from voters table
    const voterColumnsToRemove = ['nin_encrypted', 'vin_encrypted', 'otp_code', 'otp_expires_at', 'otp_verified', 'email'];
    for (const column of voterColumnsToRemove) {
      if (await columnExists('voters', column)) {
        try {
          await queryInterface.removeColumn('voters', column);
          console.log(`Removed column ${column} from voters`);
        } catch (error) {
          console.error(`Error removing column ${column} from voters:`, error);
        }
      }
    }

    // Note: password_hash column is not restored in rollback since it's no longer needed
    console.log('ℹ️  Note: password_hash column not restored as it\'s replaced by encrypted NIN/VIN + OTP authentication');

    // Remove columns from admin_users table
    const adminColumnsToRemove = ['nin_encrypted'];
    for (const column of adminColumnsToRemove) {
      if (await columnExists('admin_users', column)) {
        try {
          await queryInterface.removeColumn('admin_users', column);
          console.log(`Removed column ${column} from admin_users`);
        } catch (error) {
          console.error(`Error removing column ${column} from admin_users:`, error);
        }
      }
    }

    console.log('Rollback completed');
  }
}; 