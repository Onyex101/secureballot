#!/usr/bin/env node

const readline = require('readline');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

// Import database connection and models
require('dotenv').config({ path: path.join(__dirname, '..', '..', '..', '.env') });

// Use TypeScript transpilation for imports
require('ts-node/register');

// Import the actual models and types from the application
const db = require('../models/index.ts').default;
const { sequelize } = db;
const AdminUser = db.AdminUser;
const { UserRole } = require('../../types/auth.ts');

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Utility functions
const question = (prompt) => {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
};

const questionHidden = (prompt) => {
  return new Promise((resolve) => {
    // Temporarily disable readline interface
    rl.pause();
    
    process.stdout.write(prompt);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    
    let password = '';
    
    const onData = (char) => {
      char = char + '';
      switch(char) {
        case '\n':
        case '\r':
        case '\u0004':
          // Clean up and restore readline
          process.stdin.removeListener('data', onData);
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdout.write('\n');
          
          // Re-enable readline interface
          rl.resume();
          
          resolve(password);
          break;
        case '\u0003':
          process.exit();
          break;
        case '\u007f': // Backspace
          if (password.length > 0) {
            password = password.slice(0, -1);
            process.stdout.write('\b \b');
          }
          break;
        default:
          password += char;
          process.stdout.write('*');
          break;
      }
    };
    
    process.stdin.on('data', onData);
  });
};

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePhoneNumber = (phone) => {
  const phoneRegex = /^\+?[0-9]{10,15}$/;
  return phoneRegex.test(phone);
};

const validatePassword = (password) => {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }
  if (!/(?=.*[a-z])/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  if (!/(?=.*[A-Z])/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  if (!/(?=.*\d)/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  return { valid: true };
};

const displayRoles = () => {
  console.log('\n📋 Available Admin Roles:');
  console.log('1. SystemAdministrator (Full system access)');
  console.log('2. ElectoralCommissioner (Election management)');
  console.log('3. SecurityOfficer (Security monitoring)');
  console.log('4. SystemAuditor (Audit and compliance)');
  console.log('5. RegionalElectoralOfficer (Regional election oversight)');
  console.log('6. ElectionManager (Election operations)');
  console.log('7. ResultVerificationOfficer (Result verification)');
  console.log('');
};

const getRoleFromChoice = (choice) => {
  const roles = Object.values(UserRole);
  const index = parseInt(choice) - 1;
  return roles[index] || null;
};

// Main admin creation function
async function createAdmin() {
  try {
    console.log('🔐 SecureBallot Admin User Creation Script');
    console.log('==========================================\n');

    // Test database connection
    console.log('📡 Testing database connection...');
    await sequelize.authenticate();
    console.log('✅ Database connection successful\n');

    // Check if any admin users exist
    const adminCount = await AdminUser.count();
    const isFirstAdmin = adminCount === 0;

    if (isFirstAdmin) {
      console.log('🚀 No admin users found. Creating first System Administrator...\n');
    } else {
      console.log(`📊 Found ${adminCount} existing admin user(s)\n`);
    }

    // Collect admin details
    console.log('📝 Enter admin user details:\n');

    // Full Name
    let fullName;
    do {
      fullName = await question('👤 Full Name: ');
      if (!fullName.trim()) {
        console.log('❌ Full name is required');
      }
    } while (!fullName.trim());

    // Email
    let email;
    do {
      email = await question('📧 Email: ');
      if (!email.trim()) {
        console.log('❌ Email is required');
        continue;
      }
      if (!validateEmail(email)) {
        console.log('❌ Please enter a valid email address');
        continue;
      }

      // Check if email already exists
      const existingUser = await AdminUser.findOne({ where: { email } });
      if (existingUser) {
        console.log('❌ An admin with this email already exists');
        email = '';
      }
    } while (!email);

    // Phone Number
    let phoneNumber;
    do {
      phoneNumber = await question('📱 Phone Number (e.g., +2348012345678): ');
      if (!phoneNumber.trim()) {
        console.log('❌ Phone number is required');
        continue;
      }
      if (!validatePhoneNumber(phoneNumber)) {
        console.log('❌ Please enter a valid phone number (10-15 digits, + optional)');
        continue;
      }

      // Check if phone already exists
      const existingPhone = await AdminUser.findOne({ where: { phoneNumber } });
      if (existingPhone) {
        console.log('❌ An admin with this phone number already exists');
        phoneNumber = '';
      }
    } while (!phoneNumber);

    // Password
    let password;
    do {
      password = await questionHidden('🔒 Password: ');
      const validation = validatePassword(password);
      if (!validation.valid) {
        console.log(`❌ ${validation.message}`);
        password = '';
      }
    } while (!password);

    // Confirm Password
    let confirmPassword;
    do {
      confirmPassword = await questionHidden('🔒 Confirm Password: ');
      if (password !== confirmPassword) {
        console.log('❌ Passwords do not match');
        confirmPassword = '';
      }
    } while (!confirmPassword);

    // Role selection
    let adminType;
    if (isFirstAdmin) {
      adminType = UserRole.SYSTEM_ADMIN;
      console.log('🎯 Role: SystemAdministrator (automatically assigned for first admin)');
    } else {
      displayRoles();
      let roleChoice;
      do {
        roleChoice = await question('🎯 Select role (1-7): ');
        adminType = getRoleFromChoice(roleChoice);
        if (!adminType) {
          console.log('❌ Please enter a number between 1 and 7');
        }
      } while (!adminType);
    }

    console.log('\n📋 Admin Details Summary:');
    console.log(`👤 Name: ${fullName}`);
    console.log(`📧 Email: ${email}`);
    console.log(`📱 Phone: ${phoneNumber}`);
    console.log(`🎯 Role: ${adminType}`);

    const confirm = await question('\n✅ Create this admin user? (y/N): ');
    if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
      console.log('❌ Admin creation cancelled');
      process.exit(0);
    }

    // Create admin user
    console.log('\n🔧 Creating admin user...');

    // Hash password using AdminUser model's hashPassword method
    const passwordHash = await AdminUser.hashPassword(password);

    // Create admin user
    const newAdmin = await AdminUser.create({
      id: uuidv4(),
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      phoneNumber: phoneNumber.trim(),
      passwordHash,
      adminType,
      isActive: true,
      createdBy: isFirstAdmin ? null : null, // In a real scenario, this would be the creating admin's ID
      mfaEnabled: false,
    });

    console.log('\n🎉 Admin user created successfully!');
    console.log('\n📋 Admin Details:');
    console.log(`🆔 ID: ${newAdmin.id}`);
    console.log(`👤 Name: ${newAdmin.fullName}`);
    console.log(`📧 Email: ${newAdmin.email}`);
    console.log(`📱 Phone: ${newAdmin.phoneNumber}`);
    console.log(`🎯 Role: ${newAdmin.adminType}`);
    console.log(`📅 Created: ${newAdmin.createdAt}`);

    console.log('\n🔐 Login Information:');
    console.log(`📧 Email: ${newAdmin.email}`);
    console.log(`🔑 Password: [Use the password you entered]`);
    console.log(`🌐 Login URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/login`);

    if (isFirstAdmin) {
      console.log('\n🚀 Important Notes for First Admin:');
      console.log('• You now have full system access');
      console.log('• You can create additional admin users through the admin panel');
      console.log('• Consider enabling MFA for enhanced security');
      console.log('• Review and configure system settings');
    }

  } catch (error) {
    console.error('\n❌ Error creating admin user:', error.message);
    
    if (error.name === 'SequelizeValidationError') {
      console.error('Validation errors:');
      error.errors.forEach(err => {
        console.error(`• ${err.message}`);
      });
    } else if (error.name === 'SequelizeUniqueConstraintError') {
      console.error('• Email or phone number already exists');
    }
    
    process.exit(1);
  } finally {
    rl.close();
    await sequelize.close();
  }
}

// Handle script termination
process.on('SIGINT', () => {
  console.log('\n\n👋 Admin creation cancelled');
  rl.close();
  process.exit(0);
});

// Run the script
if (require.main === module) {
  createAdmin();
}

module.exports = { createAdmin }; 