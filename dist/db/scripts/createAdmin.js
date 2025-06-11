#!/usr/bin/env ts-node
"use strict";
/**
 * Script to create a system administrator with realistic Nigerian data
 * This script automatically generates admin credentials and displays them
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAdmin = void 0;
const uuid_1 = require("uuid");
const path_1 = __importDefault(require("path"));
// Import naija-faker with type assertion
// eslint-disable-next-line @typescript-eslint/no-var-requires
const naijaFaker = require('@codegrenade/naija-faker');
// Import database connection and models
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)({ path: path_1.default.join(__dirname, '..', '..', '..', '.env') });
const models_1 = __importDefault(require("../models"));
const auth_1 = require("../../types/auth");
const encryptionService_1 = require("../../services/encryptionService");
const logger_1 = __importDefault(require("../../utils/logger"));
const { sequelize } = models_1.default;
const { AdminUser } = models_1.default;
/**
 * Generate a unique 11-digit NIN
 */
function generateNIN() {
    let nin = '';
    for (let i = 0; i < 11; i++) {
        nin += Math.floor(Math.random() * 10).toString();
    }
    return nin;
}
/**
 * Generate a secure password
 */
function generateSecurePassword() {
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
async function createAdmin() {
    try {
        logger_1.default.info('🔐 SecureBallot System Admin Creation Script');
        logger_1.default.info('==========================================\n');
        // Test database connection
        logger_1.default.info('📡 Testing database connection...');
        await sequelize.authenticate();
        logger_1.default.info('✅ Database connection successful\n');
        // Check if any admin users exist
        const adminCount = await AdminUser.count();
        logger_1.default.info(`📊 Found ${adminCount} existing admin user(s)\n`);
        // Generate admin details using naijafaker
        logger_1.default.info('🤖 Generating admin details using Nigerian data...\n');
        const person = naijaFaker.person('yoruba', 'male');
        const nin = generateNIN();
        const password = generateSecurePassword();
        // Prepare admin data
        const adminData = {
            id: (0, uuid_1.v4)(),
            fullName: person.fullName,
            email: person.email,
            phoneNumber: person.phone,
            nin: nin,
            password: password,
            adminType: auth_1.UserRole.SYSTEM_ADMIN,
            isActive: true,
            createdBy: null,
            mfaEnabled: false,
        };
        logger_1.default.info('📋 Generated Admin Details:', {
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
            logger_1.default.warn('⚠️  Admin with this email already exists. Generating new credentials...');
            // In case of conflict, modify email slightly
            adminData.email = `admin.${Date.now()}@${adminData.email.split('@')[1]}`;
            logger_1.default.info(`📧 Updated Email: ${adminData.email}`);
        }
        // Check for NIN uniqueness
        try {
            const ninEncrypted = (0, encryptionService_1.encryptIdentity)(adminData.nin);
            const existingNin = await AdminUser.findOne({ where: { ninEncrypted } });
            if (existingNin) {
                logger_1.default.warn('⚠️  Admin with this NIN already exists. Generating new NIN...');
                adminData.nin = generateNIN();
                logger_1.default.info(`🆔 Updated NIN: ${adminData.nin}`);
            }
        }
        catch (error) {
            logger_1.default.warn('⚠️  Warning: Could not verify NIN uniqueness, continuing...');
        }
        // Create admin user
        logger_1.default.info('🔧 Creating system administrator...');
        // Hash password using AdminUser model's hashPassword method
        const passwordHash = await AdminUser.hashPassword(adminData.password);
        // Encrypt NIN for secure storage
        let ninEncrypted = null;
        try {
            ninEncrypted = (0, encryptionService_1.encryptIdentity)(adminData.nin);
            logger_1.default.info('✅ NIN encrypted successfully');
        }
        catch (error) {
            logger_1.default.warn('⚠️  Warning: Could not encrypt NIN, admin creation may fail during login');
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
        logger_1.default.info('🎉 System Administrator created successfully!');
        logger_1.default.info('📋 Admin Account Details:', {
            adminId: newAdmin.id,
            fullName: newAdmin.fullName,
            email: newAdmin.email,
            phone: newAdmin.phoneNumber,
            role: newAdmin.adminType,
            created: newAdmin.createdAt,
            status: newAdmin.isActive ? 'Active' : 'Inactive',
        });
        logger_1.default.info('🔐 Login Credentials:', {
            nin: adminData.nin,
            password: adminData.password,
            loginUrl: process.env.FRONTEND_URL || 'http://localhost:3000/admin/login',
        });
        logger_1.default.info('🚀 Important Security Notes:', {
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
        logger_1.default.info('📊 System Status:', {
            totalAdminUsers: finalAdminCount,
            encryptionStatus: ninEncrypted ? 'Enabled' : 'Disabled',
            databaseStatus: 'Connected and operational',
        });
    }
    catch (error) {
        logger_1.default.error('❌ Error creating admin user:', {
            message: error.message,
            name: error.name,
            stack: error.stack,
        });
        if (error.name === 'SequelizeValidationError') {
            logger_1.default.error('Validation errors:', {
                errors: error.errors?.map((err) => ({
                    field: err.path,
                    message: err.message,
                    value: err.value,
                })),
            });
        }
        else if (error.name === 'SequelizeUniqueConstraintError') {
            logger_1.default.error('Unique constraint violation:', {
                fields: error.fields,
                message: 'Email or phone number already exists',
            });
        }
        else if (error.name === 'SequelizeConnectionError') {
            logger_1.default.error('Database connection failed - check your database settings');
        }
        process.exit(1);
    }
    finally {
        await sequelize.close();
        logger_1.default.info('🔐 Database connection closed');
    }
}
exports.createAdmin = createAdmin;
/**
 * Main function
 */
async function main() {
    try {
        await createAdmin();
    }
    catch (error) {
        logger_1.default.error('❌ Unhandled error in admin creation script:', {
            message: error.message,
            name: error.name,
            stack: error.stack,
        });
        process.exit(1);
    }
}
// Handle script termination
process.on('SIGINT', () => {
    logger_1.default.info('\n👋 Admin creation cancelled');
    process.exit(0);
});
// Run the script
if (require.main === module) {
    main();
}
//# sourceMappingURL=createAdmin.js.map