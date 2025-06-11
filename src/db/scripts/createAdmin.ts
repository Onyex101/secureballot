#!/usr/bin/env ts-node

/**
 * Script to create a system administrator with realistic Nigerian data
 * This script automatically generates admin credentials and displays them
 */

import { v4 as uuidv4 } from 'uuid';
import path from 'path';

// Import naija-faker with type assertion
// eslint-disable-next-line @typescript-eslint/no-var-requires
const naijaFaker = require('@codegrenade/naija-faker') as any;

// Import database connection and models
import { config } from 'dotenv';
config({ path: path.join(__dirname, '..', '..', '..', '.env') });

import db from '../models';
import { UserRole } from '../../types/auth';
import { encryptIdentity } from '../../services/encryptionService';
import logger from '../../utils/logger';

const { sequelize } = db;
const { AdminUser } = db;

/**
 * Generate a unique 11-digit NIN
 */
function generateNIN(): string {
  let nin = '';
  for (let i = 0; i < 11; i++) {
    nin += Math.floor(Math.random() * 10).toString();
  }
  return nin;
}

/**
 * Generate a secure password
 */
function generateSecurePassword(): string {
  const length = 12;
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*';

  let password = '';
  // Ensure at least one character from each category
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];

  // Fill the rest randomly
  const allChars = lowercase + uppercase + numbers + symbols;
  for (let i = 4; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle the password
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
}

/**
 * Main admin creation function
 */
async function createAdmin(): Promise<void> {
  try {
    logger.info('🔐 SecureBallot System Admin Creation Script');
    logger.info('==========================================\n');

    // Test database connection
    logger.info('📡 Testing database connection...');
    await sequelize.authenticate();
    logger.info('✅ Database connection successful\n');

    // Check if any admin users exist
    const adminCount = await AdminUser.count();
    logger.info(`📊 Found ${adminCount} existing admin user(s)\n`);

    // Generate admin details using naijafaker
    logger.info('🤖 Generating admin details using Nigerian data...\n');

    const person = naijaFaker.person('yoruba', 'male');
    const nin = generateNIN();
    const password = generateSecurePassword();

    // Prepare admin data
    const adminData = {
      id: uuidv4(),
      fullName: person.fullName,
      email: person.email,
      phoneNumber: person.phone,
      nin: nin,
      password: password,
      adminType: UserRole.SYSTEM_ADMIN,
      isActive: true,
      createdBy: null,
      mfaEnabled: false,
    };

    logger.info('📋 Generated Admin Details:', {
      name: adminData.fullName,
      email: adminData.email,
      phone: adminData.phoneNumber,
      nin: adminData.nin,
      role: adminData.adminType,
      password: adminData.password,
    });

    // Check for existing admin with same email or phone
    const existingAdmin = await AdminUser.findOne({
      where: {
        email: adminData.email,
      },
    });

    if (existingAdmin) {
      logger.warn('⚠️  Admin with this email already exists. Generating new credentials...');
      // In case of conflict, modify email slightly
      adminData.email = `admin.${Date.now()}@${adminData.email.split('@')[1]}`;
      logger.info(`📧 Updated Email: ${adminData.email}`);
    }

    // Check for NIN uniqueness
    try {
      const ninEncrypted = encryptIdentity(adminData.nin);
      const existingNin = await AdminUser.findOne({ where: { ninEncrypted } });
      if (existingNin) {
        logger.warn('⚠️  Admin with this NIN already exists. Generating new NIN...');
        adminData.nin = generateNIN();
        logger.info(`🆔 Updated NIN: ${adminData.nin}`);
      }
    } catch (error) {
      logger.warn('⚠️  Warning: Could not verify NIN uniqueness, continuing...');
    }

    // Create admin user
    logger.info('🔧 Creating system administrator...');

    // Hash password using AdminUser model's hashPassword method
    const passwordHash = await AdminUser.hashPassword(adminData.password);

    // Encrypt NIN for secure storage
    let ninEncrypted = null;
    try {
      ninEncrypted = encryptIdentity(adminData.nin);
      logger.info('✅ NIN encrypted successfully');
    } catch (error) {
      logger.warn('⚠️  Warning: Could not encrypt NIN, admin creation may fail during login');
    }

    // Create admin user
    const newAdmin = await AdminUser.create({
      id: adminData.id,
      fullName: adminData.fullName.trim(),
      email: adminData.email.toLowerCase().trim(),
      phoneNumber: adminData.phoneNumber.trim(),
      passwordHash,
      adminType: adminData.adminType,
      isActive: true,
      createdBy: null,
      mfaEnabled: false,
      ninEncrypted,
      nin: adminData.nin, // Virtual field for encryption
    });

    logger.info('🎉 System Administrator created successfully!');

    logger.info('📋 Admin Account Details:', {
      adminId: newAdmin.id,
      fullName: newAdmin.fullName,
      email: newAdmin.email,
      phone: newAdmin.phoneNumber,
      role: newAdmin.adminType,
      created: newAdmin.createdAt,
      status: newAdmin.isActive ? 'Active' : 'Inactive',
    });

    logger.info('🔐 Login Credentials:', {
      nin: adminData.nin,
      password: adminData.password,
      loginUrl: process.env.FRONTEND_URL || 'http://localhost:3000/admin/login',
    });

    logger.info('🚀 Important Security Notes:', {
      notes: [
        'Save these credentials securely - they will not be displayed again',
        'Change the password after first login for enhanced security',
        'Consider enabling MFA (Multi-Factor Authentication)',
        'This admin has full system access and can create other admin users',
        'The NIN is encrypted and stored securely in the database',
      ],
    });

    // Get final system status
    const finalAdminCount = await AdminUser.count();
    logger.info('📊 System Status:', {
      totalAdminUsers: finalAdminCount,
      encryptionStatus: ninEncrypted ? 'Enabled' : 'Disabled',
      databaseStatus: 'Connected and operational',
    });
  } catch (error: any) {
    logger.error('❌ Error creating admin user:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
    });

    if (error.name === 'SequelizeValidationError') {
      logger.error('Validation errors:', {
        errors: error.errors?.map((err: any) => ({
          field: err.path,
          message: err.message,
          value: err.value,
        })),
      });
    } else if (error.name === 'SequelizeUniqueConstraintError') {
      logger.error('Unique constraint violation:', {
        fields: error.fields,
        message: 'Email or phone number already exists',
      });
    } else if (error.name === 'SequelizeConnectionError') {
      logger.error('Database connection failed - check your database settings');
    }

    process.exit(1);
  } finally {
    await sequelize.close();
    logger.info('🔐 Database connection closed');
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  try {
    await createAdmin();
  } catch (error: any) {
    logger.error('❌ Unhandled error in admin creation script:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
    });
    process.exit(1);
  }
}

// Handle script termination
process.on('SIGINT', () => {
  logger.info('\n👋 Admin creation cancelled');
  process.exit(0);
});

// Run the script
if (require.main === module) {
  main();
}

export { createAdmin };
