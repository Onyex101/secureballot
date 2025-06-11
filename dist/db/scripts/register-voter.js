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
const uuid_1 = require("uuid");
// Import naija-faker with type assertion to bypass TypeScript checking
// eslint-disable-next-line @typescript-eslint/no-var-requires
const naijaFaker = require('@codegrenade/naija-faker');
const logger_1 = __importDefault(require("../../utils/logger"));
const encryptionService_1 = require("../../services/encryptionService");
// Import models from the database
const models_1 = __importDefault(require("../models"));
const { sequelize } = models_1.default;
const { Voter, Election, Candidate, PollingUnit, VerificationStatus } = models_1.default;
/**
 * Generate a unique 11-digit NIN
 */
function generateNIN() {
    // Generate 11 random digits
    let nin = '';
    for (let i = 0; i < 11; i++) {
        nin += Math.floor(Math.random() * 10).toString();
    }
    return nin;
}
/**
 * Generate a unique 19-character VIN
 */
function generateVIN() {
    // Generate 3 random letters + 10 digits + 6 letters
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const prefix = Array.from({ length: 3 }, () => letters[Math.floor(Math.random() * 26)]).join('');
    const middle = Array.from({ length: 10 }, () => Math.floor(Math.random() * 10)).join('');
    const suffix = Array.from({ length: 6 }, () => letters[Math.floor(Math.random() * 26)]).join('');
    return `${prefix}${middle}${suffix}`;
}
/**
 * Register a new voter
 */
async function registerVoter() {
    try {
        logger_1.default.info('🗳️  Starting voter registration...');
        const person = naijaFaker.person('yoruba', 'male');
        // Generate NIN and VIN
        const nin = generateNIN();
        const vin = generateVIN();
        const ninEncrypted = (0, encryptionService_1.encryptIdentity)(nin);
        const vinEncrypted = (0, encryptionService_1.encryptIdentity)(vin);
        // Generate voter data using naijafaker
        const voterData = {
            id: (0, uuid_1.v4)(),
            ninEncrypted,
            vinEncrypted,
            nin,
            vin,
            fullName: person.fullName,
            phoneNumber: person.phone,
            email: person.email,
            dateOfBirth: faker_1.faker.date.birthdate({ min: 18, max: 65, mode: 'age' }),
            gender: 'male',
            pollingUnitCode: 'PULA100',
            state: 'Lagos',
            lga: 'Lagos Central',
            ward: 'Ward 1',
            isActive: true,
            mfaEnabled: false,
            otpVerified: false,
        };
        // Check if polling unit exists
        const pollingUnit = await PollingUnit.findOne({
            where: { pollingUnitCode: voterData.pollingUnitCode },
        });
        if (!pollingUnit) {
            logger_1.default.warn('⚠️  Polling unit PULA100 not found. Creating it...');
            await PollingUnit.create({
                id: (0, uuid_1.v4)(),
                pollingUnitCode: 'PULA100',
                pollingUnitName: 'Lagos Polling Unit 100',
                state: 'Lagos',
                lga: 'Lagos Central',
                ward: 'Ward 1',
                registeredVoters: 0,
                isActive: true,
            });
            logger_1.default.info('✅ Created polling unit PULA100');
        }
        else {
            logger_1.default.info('✅ Polling unit PULA100 found');
        }
        let newVoter;
        let voterId;
        try {
            newVoter = await Voter.create(voterData);
            voterId = newVoter.get('id');
            logger_1.default.info('🔐 Voter created:', {
                name: newVoter.get('fullName'),
                nin: newVoter.get('nin'),
                vin: newVoter.get('vin'),
                pollingUnitCode: newVoter.get('pollingUnitCode'),
                state: newVoter.get('state'),
                lga: newVoter.get('lga'),
                ward: newVoter.get('ward'),
                isActive: newVoter.get('isActive'),
                mfaEnabled: newVoter.get('mfaEnabled'),
                otpVerified: newVoter.get('otpVerified'),
            });
        }
        catch (createError) {
            logger_1.default.error('Error creating voter:', {
                name: createError?.name,
                message: createError?.message,
                stack: createError?.stack,
            });
            throw createError; // Re-throw to be caught by outer catch
        }
        // Create verification status
        await VerificationStatus.create({
            id: (0, uuid_1.v4)(),
            userId: voterId,
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
        logger_1.default.info('✅ Voter registered successfully!');
        // Display voter information including the NIN/VIN
        logger_1.default.info('🆔 Voter Identity Information:', {
            voterId,
            nin: `${nin} (Generated - encrypted in database)`,
            vin: `${vin} (Generated - encrypted in database)`,
            registrationDate: newVoter.get('createdAt').toLocaleDateString(),
        });
        // Find available elections for this voter
        logger_1.default.info('🗳️  Finding available elections for this voter...');
        // Find all active elections
        const activeElections = await Election.findAll({
            where: { isActive: true },
            include: [
                {
                    model: Candidate,
                    as: 'candidates',
                    where: { isActive: true },
                    required: false,
                },
            ],
        });
        if (activeElections.length === 0) {
            logger_1.default.warn('❌ No active elections found');
            logger_1.default.info('💡 Run the database seeder first: npm run db:seed');
            return;
        }
        logger_1.default.info(`Found ${activeElections.length} active elections`);
        for (const election of activeElections) {
            try {
                // Use .get() to safely access properties
                const electionType = election.get('electionType');
                const electionName = election.get('electionName');
                const startDate = election.get('startDate');
                const endDate = election.get('endDate');
                const status = election.get('status');
                // Check eligibility
                let eligible = false;
                if (electionType === 'PRESIDENTIAL') {
                    eligible = true; // All voters can vote in presidential elections
                }
                else if (electionType === 'GUBERNATORIAL' && voterData.state === 'Lagos') {
                    eligible = true; // Lagos voters can vote in Lagos gubernatorial elections
                }
                const electionInfo = {
                    name: electionName,
                    type: electionType,
                    startDate: startDate?.toLocaleDateString(),
                    endDate: endDate?.toLocaleDateString(),
                    status: status,
                    eligible: eligible ? 'Yes ✅' : 'No ❌',
                    candidateCount: election.candidates?.length || 0,
                };
                logger_1.default.info('📊 Election Details:', electionInfo);
                if (election.candidates && election.candidates.length > 0) {
                    const candidates = election.candidates.map((candidate, index) => ({
                        position: index + 1,
                        name: candidate.fullName,
                        party: candidate.partyCode,
                    }));
                    logger_1.default.info('👥 Candidates:', candidates);
                }
                else {
                    logger_1.default.warn('No candidates registered for this election yet');
                }
            }
            catch (electionError) {
                logger_1.default.error('Error processing election:', electionError.message);
            }
        }
        // Show voting instructions
        logger_1.default.info('📝 Voting Instructions:', {
            presidentialEligibility: 'This voter can participate in Presidential elections (all Nigerian voters)',
            gubernatorialEligibility: 'This voter can participate in Lagos Gubernatorial elections (Lagos residents only)',
            verificationStatus: 'Voter verification is complete and ready to vote',
            authenticationMethod: 'Authentication uses encrypted NIN/VIN + OTP (no password required)',
        });
        logger_1.default.info('🎉 Voter registration complete!');
    }
    catch (error) {
        logger_1.default.error('❌ Error registering voter:');
        logger_1.default.error('Error name:', error?.name || 'Unknown');
        logger_1.default.error('Error message:', error?.message || 'Unknown');
        logger_1.default.error('Error stack:', error?.stack || 'No stack trace');
        if (error.name === 'SequelizeValidationError') {
            logger_1.default.error('Validation errors:', error.errors?.map((err) => ({
                field: err.path,
                message: err.message,
            })));
        }
        if (error.name === 'SequelizeUniqueConstraintError') {
            logger_1.default.error('Unique constraint violation:', {
                fields: error.fields,
            });
        }
        if (error.name === 'SequelizeConnectionError') {
            logger_1.default.error('Database connection error - make sure the database is running');
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
        await sequelize.authenticate();
        logger_1.default.info('✅ Database connection established');
        // Register the voter
        await registerVoter();
    }
    catch (error) {
        logger_1.default.error('❌ Database connection failed:', error.message);
        logger_1.default.error('💡 Make sure the database is running and environment variables are set correctly');
    }
    finally {
        // Close database connection
        await sequelize.close();
        logger_1.default.info('🔐 Database connection closed');
    }
}
// Run the script
if (require.main === module) {
    main().catch(error => {
        logger_1.default.error('Unhandled error in voter registration script:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=register-voter.js.map