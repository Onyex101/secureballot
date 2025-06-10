#!/usr/bin/env ts-node
"use strict";
/**
 * Script to register a single voter with realistic Nigerian data
 * This script demonstrates the voter registration process and shows
 * available elections for a Lagos-based voter.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerVoter = void 0;
const faker_1 = require("@faker-js/faker");
const naija_faker_1 = __importDefault(require("@codegrenade/naija-faker"));
const uuid_1 = require("uuid");
// Import models from the source
const Voter_1 = __importDefault(require("../src/db/models/Voter"));
const Election_1 = __importDefault(require("../src/db/models/Election"));
const Candidate_1 = __importDefault(require("../src/db/models/Candidate"));
const PollingUnit_1 = __importDefault(require("../src/db/models/PollingUnit"));
const VerificationStatus_1 = __importDefault(require("../src/db/models/VerificationStatus"));
const models_1 = __importDefault(require("../src/db/models"));
/**
 * Generate a unique 11-digit NIN
 */
function generateNIN() {
    return faker_1.faker.string.numeric(11);
}
/**
 * Generate a unique 19-character VIN
 */
function generateVIN() {
    const prefix = faker_1.faker.string.alpha(3).toUpperCase();
    const middle = faker_1.faker.string.numeric(10);
    const suffix = faker_1.faker.string.alpha(6).toUpperCase();
    return `${prefix}${middle}${suffix}`;
}
/**
 * Register a new voter
 */
async function registerVoter() {
    try {
        console.log('🗳️  Starting voter registration...\n');
        // Generate voter data using naijafaker
        const voterData = {
            id: (0, uuid_1.v4)(),
            nin: generateNIN(),
            vin: generateVIN(),
            fullName: naija_faker_1.default.name(),
            phoneNumber: naija_faker_1.default.phoneNumber(),
            email: `${naija_faker_1.default.name().toLowerCase().replace(/\s+/g, '.')}@example.com`,
            dateOfBirth: faker_1.faker.date.birthdate({ min: 18, max: 65, mode: 'age' }),
            gender: faker_1.faker.datatype.boolean() ? 'male' : 'female',
            pollingUnitCode: 'PULA100',
            state: 'Lagos',
            lga: 'Lagos Central',
            ward: 'Ward 1',
            isActive: true,
            mfaEnabled: false,
            otpVerified: false,
        };
        console.log('Generated voter data:');
        console.log('📋 Basic Information:');
        console.log(`   - Name: ${voterData.fullName}`);
        console.log(`   - Phone: ${voterData.phoneNumber}`);
        console.log(`   - Email: ${voterData.email}`);
        console.log(`   - Date of Birth: ${voterData.dateOfBirth.toLocaleDateString()}`);
        console.log(`   - Gender: ${voterData.gender}`);
        console.log(`   - Polling Unit: ${voterData.pollingUnitCode}`);
        console.log(`   - State: ${voterData.state}`);
        console.log(`   - LGA: ${voterData.lga}`);
        console.log(`   - Ward: ${voterData.ward}\n`);
        // Check if polling unit exists
        const pollingUnit = await PollingUnit_1.default.findOne({
            where: { pollingUnitCode: voterData.pollingUnitCode },
        });
        if (!pollingUnit) {
            console.log('⚠️  Polling unit PULA100 not found. Creating it...');
            await PollingUnit_1.default.create({
                id: (0, uuid_1.v4)(),
                pollingUnitCode: 'PULA100',
                pollingUnitName: 'Lagos Polling Unit 100',
                state: 'Lagos',
                lga: 'Lagos Central',
                ward: 'Ward 1',
                registeredVoters: 0,
                isActive: true,
            });
            console.log('✅ Created polling unit PULA100\n');
        }
        else {
            console.log('✅ Polling unit PULA100 found\n');
        }
        // Create the voter using the model (will trigger encryption hooks)
        console.log('🔐 Registering voter (NIN and VIN will be encrypted)...');
        const newVoter = await Voter_1.default.create(voterData);
        // Create verification status
        await VerificationStatus_1.default.create({
            id: (0, uuid_1.v4)(),
            userId: newVoter.id,
            isPhoneVerified: true,
            isEmailVerified: true,
            isIdentityVerified: true,
            isAddressVerified: true,
            isBiometricVerified: true,
            verificationLevel: 3,
            lastVerifiedAt: new Date(),
            isVerified: true,
            state: 'verified',
            verifiedAt: new Date(),
            verificationMethod: 'biometric',
            verificationData: JSON.stringify({
                phone_verified_at: new Date().toISOString(),
                verification_type: 'manual_registration',
                biometric_score: 0.98,
            }),
        });
        console.log('✅ Voter registered successfully!\n');
        // Display voter information including the NIN/VIN
        console.log('🆔 Voter Identity Information:');
        console.log(`   - Voter ID: ${newVoter.id}`);
        console.log(`   - NIN: ${voterData.nin} (Generated - encrypted in database)`);
        console.log(`   - VIN: ${voterData.vin} (Generated - encrypted in database)`);
        console.log(`   - Registration Date: ${newVoter.createdAt.toLocaleDateString()}\n`);
        // Find available elections for this voter
        console.log('🗳️  Available Elections for this voter:\n');
        // Find all active elections
        const activeElections = await Election_1.default.findAll({
            where: { isActive: true },
            include: [
                {
                    model: Candidate_1.default,
                    as: 'candidates',
                    where: { isActive: true },
                    required: false,
                },
            ],
        });
        if (activeElections.length === 0) {
            console.log('❌ No active elections found');
            console.log('💡 Run the database seeder first: npm run db:seed\n');
            return;
        }
        for (const election of activeElections) {
            console.log(`📊 ${election.electionName}`);
            console.log(`   - Type: ${election.electionType}`);
            console.log(`   - Start: ${election.startDate.toLocaleDateString()}`);
            console.log(`   - End: ${election.endDate.toLocaleDateString()}`);
            console.log(`   - Status: ${election.status}`);
            // Check eligibility
            let eligible = false;
            if (election.electionType === 'PRESIDENTIAL') {
                eligible = true; // All voters can vote in presidential elections
            }
            else if (election.electionType === 'GUBERNATORIAL' && voterData.state === 'Lagos') {
                eligible = true; // Lagos voters can vote in Lagos gubernatorial elections
            }
            console.log(`   - Eligible: ${eligible ? '✅ Yes' : '❌ No'}`);
            if (election.candidates && election.candidates.length > 0) {
                console.log(`   - Candidates (${election.candidates.length}):`);
                election.candidates.forEach((candidate, index) => {
                    console.log(`     ${index + 1}. ${candidate.fullName} (${candidate.partyCode})`);
                });
            }
            else {
                console.log(`   - Candidates: No candidates registered yet`);
            }
            console.log('');
        }
        // Show voting instructions
        console.log('📝 Voting Instructions:');
        console.log('   - This voter can participate in Presidential elections (all Nigerian voters)');
        console.log('   - This voter can participate in Lagos Gubernatorial elections (Lagos residents only)');
        console.log('   - Voter verification is complete and ready to vote');
        console.log('   - Authentication uses encrypted NIN/VIN + OTP (no password required)\n');
        console.log('🎉 Voter registration complete!');
    }
    catch (error) {
        console.error('❌ Error registering voter:', error.message);
        if (error.name === 'SequelizeValidationError') {
            console.error('Validation errors:');
            error.errors?.forEach((err) => {
                console.error(`   - ${err.path}: ${err.message}`);
            });
        }
        if (error.name === 'SequelizeUniqueConstraintError') {
            console.error('Unique constraint violation:');
            console.error(`   - Fields: ${JSON.stringify(error.fields)}`);
        }
        if (error.name === 'SequelizeConnectionError') {
            console.error('Database connection error - make sure the database is running');
        }
    }
}
exports.registerVoter = registerVoter;
/**
 * Main function
 */
async function main() {
    try {
        // Test database connection
        await models_1.default.authenticate();
        console.log('✅ Database connection established\n');
        // Register the voter
        await registerVoter();
    }
    catch (error) {
        console.error('❌ Database connection failed:', error.message);
        console.error('💡 Make sure the database is running and environment variables are set correctly');
    }
    finally {
        // Close database connection
        await models_1.default.close();
        console.log('\n🔐 Database connection closed');
    }
}
// Run the script
if (require.main === module) {
    main().catch(console.error);
}
//# sourceMappingURL=register-voter.js.map