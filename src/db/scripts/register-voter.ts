#!/usr/bin/env ts-node

/**
 * Script to register a single voter with realistic Nigerian data
 * This script demonstrates the voter registration process and shows
 * available elections for a Lagos-based voter.
 */

import { faker } from '@faker-js/faker';
import { v4 as uuidv4 } from 'uuid';

// Import naija-faker with type assertion to bypass TypeScript checking
// eslint-disable-next-line @typescript-eslint/no-var-requires
const naijaFaker = require('@codegrenade/naija-faker') as any;
import logger from '../../utils/logger';
import { encryptIdentity } from '../../services/encryptionService';

// Import models from the database
import db from '../models';

const { sequelize } = db;
const { Voter, Election, Candidate, PollingUnit, VerificationStatus } = db;

/**
 * Generate a unique 11-digit NIN
 */
function generateNIN(): string {
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
function generateVIN(): string {
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
async function registerVoter(): Promise<void> {
  try {
    logger.info('🗳️  Starting voter registration...');
    const person = naijaFaker.person('yoruba', 'male');

    // Generate NIN and VIN
    const nin = generateNIN();
    const vin = generateVIN();

    const ninEncrypted = encryptIdentity(nin);
    const vinEncrypted = encryptIdentity(vin);

    // Generate voter data using naijafaker
    const voterData = {
      id: uuidv4(),
      ninEncrypted,
      vinEncrypted,
      nin,
      vin,
      fullName: person.fullName,
      phoneNumber: person.phone,
      email: person.email,
      dateOfBirth: faker.date.birthdate({ min: 18, max: 65, mode: 'age' }),
      gender: 'male',
      pollingUnitCode: 'PULA100', // Lagos polling unit
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
      logger.warn('⚠️  Polling unit PULA100 not found. Creating it...');
      await PollingUnit.create({
        id: uuidv4(),
        pollingUnitCode: 'PULA100',
        pollingUnitName: 'Lagos Polling Unit 100',
        state: 'Lagos',
        lga: 'Lagos Central',
        ward: 'Ward 1',
        registeredVoters: 0,
        isActive: true,
      });
      logger.info('✅ Created polling unit PULA100');
    } else {
      logger.info('✅ Polling unit PULA100 found');
    }

    let newVoter: any;
    let voterId: string;

    try {
      newVoter = await Voter.create(voterData);
      voterId = newVoter.get('id') as string;
      logger.info('🔐 Voter created:', {
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
    } catch (createError: any) {
      logger.error('Error creating voter:', {
        name: createError?.name,
        message: createError?.message,
        stack: createError?.stack,
      });
      throw createError; // Re-throw to be caught by outer catch
    }

    // Create verification status
    await VerificationStatus.create({
      id: uuidv4(),
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

    logger.info('✅ Voter registered successfully!');

    // Display voter information including the NIN/VIN
    logger.info('🆔 Voter Identity Information:', {
      voterId,
      nin: `${nin} (Generated - encrypted in database)`,
      vin: `${vin} (Generated - encrypted in database)`,
      registrationDate: (newVoter.get('createdAt') as Date).toLocaleDateString(),
    });

    // Find available elections for this voter
    logger.info('🗳️  Finding available elections for this voter...');

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
      logger.warn('❌ No active elections found');
      logger.info('💡 Run the database seeder first: npm run db:seed');
      return;
    }

    logger.info(`Found ${activeElections.length} active elections`);

    for (const election of activeElections) {
      try {
        // Use .get() to safely access properties
        const electionType = election.get('electionType') as string;
        const electionName = election.get('electionName') as string;
        const startDate = election.get('startDate') as Date;
        const endDate = election.get('endDate') as Date;
        const status = election.get('status') as string;
        // Check eligibility
        let eligible = false;
        if (electionType === 'PRESIDENTIAL') {
          eligible = true; // All voters can vote in presidential elections
        } else if (electionType === 'GUBERNATORIAL' && voterData.state === 'Lagos') {
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

        logger.info('📊 Election Details:', electionInfo);

        if (election.candidates && election.candidates.length > 0) {
          const candidates = election.candidates.map((candidate: any, index: number) => ({
            position: index + 1,
            name: candidate.fullName,
            party: candidate.partyCode,
          }));
          logger.info('👥 Candidates:', candidates);
        } else {
          logger.warn('No candidates registered for this election yet');
        }
      } catch (electionError: any) {
        logger.error('Error processing election:', electionError.message);
      }
    }

    // Show voting instructions
    logger.info('📝 Voting Instructions:', {
      presidentialEligibility:
        'This voter can participate in Presidential elections (all Nigerian voters)',
      gubernatorialEligibility:
        'This voter can participate in Lagos Gubernatorial elections (Lagos residents only)',
      verificationStatus: 'Voter verification is complete and ready to vote',
      authenticationMethod: 'Authentication uses encrypted NIN/VIN + OTP (no password required)',
    });

    logger.info('🎉 Voter registration complete!');
  } catch (error: any) {
    logger.error('❌ Error registering voter:');
    logger.error('Error name:', error?.name || 'Unknown');
    logger.error('Error message:', error?.message || 'Unknown');
    logger.error('Error stack:', error?.stack || 'No stack trace');

    if (error.name === 'SequelizeValidationError') {
      logger.error(
        'Validation errors:',
        error.errors?.map((err: any) => ({
          field: err.path,
          message: err.message,
        })),
      );
    }

    if (error.name === 'SequelizeUniqueConstraintError') {
      logger.error('Unique constraint violation:', {
        fields: error.fields,
      });
    }

    if (error.name === 'SequelizeConnectionError') {
      logger.error('Database connection error - make sure the database is running');
    }
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  try {
    // Test database connection
    await sequelize.authenticate();
    logger.info('✅ Database connection established');

    // Register the voter
    await registerVoter();
  } catch (error: any) {
    logger.error('❌ Database connection failed:', error.message);
    logger.error(
      '💡 Make sure the database is running and environment variables are set correctly',
    );
  } finally {
    // Close database connection
    await sequelize.close();
    logger.info('🔐 Database connection closed');
  }
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    logger.error('Unhandled error in voter registration script:', error);
    process.exit(1);
  });
}

export { registerVoter };
