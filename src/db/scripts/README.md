# SecureBallot Scripts

This directory contains utility scripts for SecureBallot system administration and maintenance.

## 🔐 Admin User Creation Script

### Overview

The admin creation script (located at `src/db/scripts/createAdmin.js`) allows you to create admin users for the SecureBallot system. This is essential for:

- Creating the initial System Administrator
- Adding additional admin users with specific roles
- Setting up admin accounts without API access

### Prerequisites

1. **Database Setup**: Ensure your PostgreSQL database is running and migrations have been applied
2. **Environment Variables**: Make sure your `.env` file is properly configured
3. **Dependencies**: All npm packages should be installed

### Usage

#### Method 1: Using npm script (Recommended)
```bash
npm run admin:create
```

#### Method 2: Direct execution
```bash
node scripts/createAdmin.js
```

#### Method 3: Executable script
```bash
./src/db/scripts/createAdmin.js
```

### 📋 Available Admin Roles

| **Role** | **Description** | **Access Level** |
|----------|-----------------|------------------|
| **SystemAdministrator** | Full system access, can create other admins | Highest |
| **ElectoralCommissioner** | Election management and oversight | High |
| **SecurityOfficer** | Security monitoring and incident response | High |
| **SystemAuditor** | Audit trails and compliance monitoring | Medium |
| **RegionalElectoralOfficer** | Regional election oversight | Medium |
| **ElectionManager** | Election operations and management | Medium |
| **ResultVerificationOfficer** | Election result verification | Medium |

### 🚀 First Admin Setup

When running the script for the first time (no admin users exist):

1. The script automatically assigns the **SystemAdministrator** role
2. This first admin can then create additional admin users through:
   - The admin creation script
   - The admin panel UI (once logged in)
   - The API endpoint `POST /api/v1/admin/users`

### 📝 Interactive Prompts

The script will prompt you for:

1. **Full Name**: Admin user's complete name
2. **Email**: Valid email address (used for login)
3. **Phone Number**: Phone number in international format (e.g., +2348012345678)
4. **Password**: Secure password meeting requirements:
   - At least 8 characters
   - At least one lowercase letter
   - At least one uppercase letter
   - At least one number
5. **Role**: Select from available admin roles (auto-assigned for first admin)

### 🔒 Security Features

- **Password Validation**: Enforces strong password requirements
- **Email Validation**: Ensures valid email format
- **Duplicate Prevention**: Checks for existing email/phone numbers
- **Secure Hashing**: Uses bcrypt with salt rounds of 12
- **Hidden Password Input**: Passwords are masked during entry

### 📊 Example Usage

```bash
$ npm run admin:create

🔐 SecureBallot Admin User Creation Script
==========================================

📡 Testing database connection...
✅ Database connection successful

🚀 No admin users found. Creating first System Administrator...

📝 Enter admin user details:

👤 Full Name: John Admin
📧 Email: admin@securevote.ng
📱 Phone Number (e.g., +2348012345678): +2348012345678
🔒 Password: ********
🔒 Confirm Password: ********
🎯 Role: SystemAdministrator (automatically assigned for first admin)

📋 Admin Details Summary:
👤 Name: John Admin
📧 Email: admin@securevote.ng
📱 Phone: +2348012345678
🎯 Role: SystemAdministrator

✅ Create this admin user? (y/N): y

🔧 Creating admin user...

🎉 Admin user created successfully!

📋 Admin Details:
🆔 ID: 123e4567-e89b-12d3-a456-426614174000
👤 Name: John Admin
📧 Email: admin@securevote.ng
📱 Phone: +2348012345678
🎯 Role: SystemAdministrator
📅 Created: 2024-01-15T10:30:00.000Z

🔐 Login Information:
📧 Email: admin@securevote.ng
🔑 Password: [Use the password you entered]
🌐 Login URL: http://localhost:3000/admin/login

🚀 Important Notes for First Admin:
• You now have full system access
• You can create additional admin users through the admin panel
• Consider enabling MFA for enhanced security
• Review and configure system settings
```

### 🛠️ Troubleshooting

#### Database Connection Issues
```bash
❌ Error: Connection refused
```
- Verify PostgreSQL is running
- Check database credentials in `.env`
- Ensure database exists and migrations are applied

#### Validation Errors
```bash
❌ Email or phone number already exists
```
- Use a different email or phone number
- Check existing admin users if unsure

#### Permission Errors
```bash
❌ Permission denied
```
- Ensure the script has execute permissions: `chmod +x src/db/scripts/createAdmin.js`
- Check file system permissions

### 🔧 Environment Variables

The script uses these environment variables from your `.env` file:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=secureballot
DB_USER=your_db_user
DB_PASS=your_db_password

# Optional: Frontend URL for login link
FRONTEND_URL=http://localhost:3000
```

### 🔄 After Admin Creation

Once you've created an admin user:

1. **Test Login**: Use the provided credentials to log into the admin panel
2. **Enable MFA**: Consider enabling multi-factor authentication for enhanced security
3. **Create Additional Admins**: Use the admin panel or API to create more admin users
4. **Review Permissions**: Ensure each admin has appropriate role assignments

### 📚 Related Documentation

- [Admin API Endpoints](../src/docs/admin.ts) - API documentation for admin operations
- [Authentication Guide](../src/docs/auth.ts) - Authentication and authorization details
- [Database Schema](../src/db/sql/create_tables.sql) - Database table structure

### 🚨 Security Considerations

1. **Store Credentials Securely**: Never commit passwords to version control
2. **Use Strong Passwords**: Follow organizational password policies
3. **Enable MFA**: Set up multi-factor authentication for all admin accounts
4. **Regular Audits**: Review admin user accounts regularly
5. **Principle of Least Privilege**: Assign minimum necessary permissions

### 💡 Tips

- Run the script in a secure environment
- Keep a secure record of the first admin credentials
- Consider using a password manager for admin credentials
- Test the admin login immediately after creation
- Set up proper backup procedures for the admin database

# SecureBallot Database Scripts

This directory contains database utility scripts for the SecureBallot voting platform.

## Voter Registration Script

The `register-voter.ts` script allows you to register a single voter with realistic Nigerian data.

### Features

- **Realistic Nigerian Data**: Uses `@codegrenade/naija-faker` to generate authentic Nigerian names and phone numbers
- **Lagos-based Voter**: Sets polling unit to 'PULA100' (Lagos state)
- **Election Eligibility**: Shows available elections (Presidential and Lagos Gubernatorial)
- **Encrypted Storage**: NIN and VIN are automatically encrypted when stored
- **Full Verification**: Creates a fully verified voter ready to vote
- **Structured Logging**: Uses the project's winston logger for proper logging

### Usage

```bash
# Run the voter registration script
npm run voter:register

# Or run directly
ts-node src/db/scripts/register-voter.ts
```

### Prerequisites

1. Database must be running and accessible
2. Database tables must be migrated
3. Seeded data (elections, candidates) should exist for best results

### What the Script Does

1. **Generates Voter Data**:
   - Nigerian name using naijafaker
   - Nigerian phone number (+234XXXXXXXXXX format)
   - Email address based on the name
   - Random date of birth (18-65 years old)
   - Gender (male/female)
   - Polling unit set to 'PULA100' (Lagos)

2. **Creates Database Records**:
   - Voter record with encrypted NIN/VIN
   - Verification status (fully verified)
   - Checks/creates polling unit if needed

3. **Shows Election Information**:
   - Lists all active elections
   - Indicates voter eligibility
   - Shows candidates for each election

### Sample Output

The script uses structured logging via winston, so output will be formatted according to your logger configuration. Key information logged includes:

- Generated voter data (name, phone, email, etc.)
- Voter identity information (ID, NIN, VIN)
- Available elections with eligibility status
- Candidates for each election
- Voting instructions

### Authentication System

- **Voters authenticate using**: Encrypted NIN/VIN + OTP (no password required)
- **NIN and VIN are encrypted** in the database for security
- **OTP verification** is required for voting (currently hardcoded to 723111 for POC)

### Election Eligibility

- **Presidential Elections**: All Nigerian voters are eligible
- **Gubernatorial Elections**: Only voters in the specific state are eligible
- **Lagos Voters**: Can vote in both Presidential and Lagos Gubernatorial elections

### Error Handling

The script handles common errors with structured logging:
- Database connection issues
- Missing polling units (creates them automatically)
- Validation errors
- Unique constraint violations

### Development Notes

- Uses the project's winston logger for consistent logging
- Imports models directly from the TypeScript source
- Handles model loading and database connections automatically
- Uses the same encryption and validation as the main application 