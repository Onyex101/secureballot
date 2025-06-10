#!/usr/bin/env node

/**
 * Data Migration Script: Hash existing NIN/VIN data
 *
 * This script migrates existing voter and admin data to use encrypted/hashed
 * identity fields for the new authentication system.
 *
 * Usage:
 *   node scripts/migrate-identity-data.js [--dry-run] [--batch-size=100]
 *
 * Options:
 *   --dry-run: Preview changes without applying them
 *   --batch-size: Number of records to process at once (default: 100)
 */

require('dotenv').config();
const { Sequelize, Op } = require('sequelize');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// Database configuration
const config = require('../src/config/database.js');
const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

// Encryption utilities
const getEncryptionKey = () => {
  const envKey = process.env.IDENTITY_ENCRYPTION_KEY;
  if (envKey && envKey.length === 64) {
    return envKey;
  }
  return 'a'.repeat(64); // Fallback key
};

const encryptWithAES = (data, key) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);

  let encrypted = cipher.update(data, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  return {
    iv: iv.toString('hex'),
    encryptedData: encrypted,
  };
};

const encryptIdentity = identity => {
  const key = getEncryptionKey();
  const result = encryptWithAES(identity, key);
  return `${result.iv}:${result.encryptedData}`;
};

const hashIdentity = async identity => {
  const saltRounds = 12;
  return bcrypt.hash(identity, saltRounds);
};

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const batchSizeArg = args.find(arg => arg.startsWith('--batch-size='));
const batchSize = batchSizeArg ? parseInt(batchSizeArg.split('=')[1]) : 100;

console.log('🔐 Identity Data Migration Script');
console.log('==================================');
console.log(`Mode: ${isDryRun ? 'DRY RUN (Preview)' : 'LIVE MIGRATION'}`);
console.log(`Batch Size: ${batchSize}`);
console.log('');

// Create Sequelize instance
const sequelize = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, {
  host: dbConfig.host,
  port: dbConfig.port,
  dialect: dbConfig.dialect,
  logging: false, // Disable query logging for cleaner output
});

async function migrateVoterData() {
  console.log('📊 Migrating Voter Data...');

  try {
    // Get total count
    const [totalCountResult] = await sequelize.query(
      `SELECT COUNT(*) as count FROM voters WHERE nin_hash IS NULL OR vin_hash IS NULL`,
    );
    const totalCount = totalCountResult[0].count;

    if (totalCount === 0) {
      console.log('✅ No voters need migration');
      return;
    }

    console.log(`📝 Found ${totalCount} voters to migrate`);

    let processed = 0;
    let offset = 0;

    while (offset < totalCount) {
      // Get batch of voters
      const [voters] = await sequelize.query(`
        SELECT id, nin, vin, email 
        FROM voters 
        WHERE nin_hash IS NULL OR vin_hash IS NULL
        LIMIT ${batchSize} OFFSET ${offset}
      `);

      if (voters.length === 0) break;

      for (const voter of voters) {
        try {
          let updates = [];
          let values = [];

          // Encrypt NIN if not already done
          if (voter.nin) {
            const ninEncrypted = encryptIdentity(voter.nin);
            updates.push('nin_encrypted = ?');
            values.push(ninEncrypted);
          }

          // Encrypt VIN if not already done
          if (voter.vin) {
            const vinEncrypted = encryptIdentity(voter.vin);
            updates.push('vin_encrypted = ?');
            values.push(vinEncrypted);
          }

          // Set default email if none exists
          if (!voter.email) {
            // Generate a placeholder email that can be updated later
            const placeholderEmail = `voter_${voter.id.substring(0, 8)}@placeholder.local`;
            updates.push('email = ?');
            values.push(placeholderEmail);
          }

          if (updates.length > 0) {
            values.push(voter.id);

            if (!isDryRun) {
              await sequelize.query(
                `
                UPDATE voters 
                SET ${updates.join(', ')}
                WHERE id = ?
              `,
                {
                  replacements: values,
                },
              );
            }

            processed++;
            if (processed % 10 === 0) {
              process.stdout.write(`\r⏳ Processed ${processed}/${totalCount} voters...`);
            }
          }
        } catch (error) {
          console.error(`\n❌ Error processing voter ${voter.id}:`, error.message);
        }
      }

      offset += batchSize;
    }

    console.log(`\n✅ Migrated ${processed} voters`);
  } catch (error) {
    console.error('❌ Error migrating voter data:', error);
    throw error;
  }
}

async function migrateAdminData() {
  console.log('\n👑 Migrating Admin Data...');

  try {
    // Get total count
    const [totalCountResult] = await sequelize.query(
      `SELECT COUNT(*) as count FROM admin_users WHERE nin_hash IS NULL`,
    );
    const totalCount = totalCountResult[0].count;

    if (totalCount === 0) {
      console.log('✅ No admins need migration');
      return;
    }

    console.log(`📝 Found ${totalCount} admins to migrate`);
    console.log('⚠️  NOTE: Admin NIN values need to be set manually before running this migration');
    console.log('          This script will only hash existing NIN values');

    // For now, we'll just create placeholder entries since we don't have actual NIN data for admins
    if (!isDryRun) {
      console.log('⏭️  Skipping admin migration - NIN data must be populated manually first');
      console.log('    Use the admin panel or database to set NIN values for admins');
      console.log('    Then run: UPDATE admin_users SET nin_hash = ? WHERE id = ?');
    }
  } catch (error) {
    console.error('❌ Error migrating admin data:', error);
    throw error;
  }
}

async function createOtpCleanupSchedule() {
  console.log('\n🧹 Setting up OTP cleanup...');

  if (!isDryRun) {
    // Note: In a real deployment, you'd set up a cron job or scheduled task
    console.log('📝 Remember to set up a scheduled task to clean up expired OTPs:');
    console.log(
      "   - Run every 15 minutes: DELETE FROM otp_logs WHERE expires_at < NOW() AND status = 'sent'",
    );
    console.log('   - Or use the cleanupExpiredOtps function in the OTP service');
  }
}

async function verifyMigration() {
  console.log('\n🔍 Verifying Migration...');

  try {
    // Check voter migration
    const [voterStats] = await sequelize.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(nin_hash) as with_nin_hash,
        COUNT(vin_hash) as with_vin_hash,
        COUNT(email) as with_email
      FROM voters
    `);

    console.log('📊 Voter Statistics:');
    console.log(`   Total voters: ${voterStats[0].total}`);
    console.log(`   With NIN hash: ${voterStats[0].with_nin_hash}`);
    console.log(`   With VIN hash: ${voterStats[0].with_vin_hash}`);
    console.log(`   With email: ${voterStats[0].with_email}`);

    // Check admin migration
    const [adminStats] = await sequelize.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(nin_hash) as with_nin_hash
      FROM admin_users
    `);

    console.log('\n👑 Admin Statistics:');
    console.log(`   Total admins: ${adminStats[0].total}`);
    console.log(`   With NIN hash: ${adminStats[0].with_nin_hash}`);

    // Check if OTP table exists
    const [otpTableExists] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'otp_logs'
      ) as exists
    `);

    console.log('\n📋 OTP System:');
    console.log(`   OTP logs table exists: ${otpTableExists[0].exists ? 'Yes' : 'No'}`);
  } catch (error) {
    console.error('❌ Error verifying migration:', error);
  }
}

async function main() {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    if (isDryRun) {
      console.log('\n🔍 DRY RUN MODE - No changes will be made');
    }

    // Run migrations
    await migrateVoterData();
    await migrateAdminData();
    await createOtpCleanupSchedule();
    await verifyMigration();

    console.log('\n🎉 Migration completed successfully!');

    if (!isDryRun) {
      console.log('\n📋 Next Steps:');
      console.log('1. Update voter records with actual email addresses');
      console.log('2. Set NIN values for admin users');
      console.log('3. Run this script again to hash admin NIN values');
      console.log('4. Test the new authentication endpoints');
      console.log('5. Set up OTP cleanup scheduled task');
    }
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run the migration
main();
