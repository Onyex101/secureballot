import Voter from '../db/models/Voter';
import VerificationStatus from '../db/models/VerificationStatus';
import PollingUnit from '../db/models/PollingUnit';
import Vote from '../db/models/Vote';
import { ApiError } from '../middleware/errorHandler';
import { encryptIdentity } from './encryptionService';
import { logger } from '../config/logger';

/**
 * Get voter profile by ID
 */
export const getVoterProfile = async (voterId: string): Promise<any> => {
  const voter = await Voter.findByPk(voterId, {
    attributes: [
      'id',
      'ninEncrypted',
      'vinEncrypted',
      'phoneNumber',
      'dateOfBirth',
      'fullName',
      'pollingUnitCode',
      'state',
      'gender',
      'lga',
      'ward',
      'isActive',
      'createdAt',
      'lastLogin',
      'mfaEnabled',
      'publicKey',
    ],
    include: [
      {
        model: VerificationStatus,
        as: 'verificationStatus',
        attributes: [
          'isPhoneVerified',
          'isEmailVerified',
          'isIdentityVerified',
          'isAddressVerified',
          'isBiometricVerified',
          'verificationLevel',
          'lastVerifiedAt',
        ],
      },
      {
        model: PollingUnit,
        as: 'pollingUnit',
        attributes: ['id', 'pollingUnitName', 'pollingUnitCode', 'address'],
      },
    ],
  });

  if (!voter) {
    throw new ApiError(404, 'Voter not found');
  }

  const verificationStatus = voter.get('verificationStatus') as VerificationStatus | undefined;
  const pollingUnit = voter.get('pollingUnit') as PollingUnit | undefined;

  return {
    id: voter.id,
    nin: voter.decryptedNin,
    vin: voter.decryptedVin,
    phoneNumber: voter.phoneNumber,
    dateOfBirth: voter.dateOfBirth,
    fullName: voter.fullName,
    isActive: voter.isActive,
    createdAt: voter.createdAt,
    lastLogin: voter.lastLogin,
    mfaEnabled: voter.mfaEnabled,
    publicKey: voter.publicKey,
    verification: verificationStatus
      ? {
          phoneVerified: verificationStatus.isPhoneVerified,
          emailVerified: verificationStatus.isEmailVerified,
          identityVerified: verificationStatus.isIdentityVerified,
          addressVerified: verificationStatus.isAddressVerified,
          biometricVerified: verificationStatus.isBiometricVerified,
          level: verificationStatus.verificationLevel,
          lastVerified: verificationStatus.lastVerifiedAt,
        }
      : null,
    voterCard: {
      vin: voter.decryptedVin,
      pollingUnitCode: voter.pollingUnitCode,
      pollingUnit: pollingUnit
        ? {
            id: pollingUnit.id,
            name: pollingUnit.pollingUnitName,
            code: pollingUnit.pollingUnitCode,
            address: pollingUnit.address,
          }
        : null,
    },
  };
};

/**
 * Update voter profile
 */
export const updateVoterProfile = async (
  voterId: string,
  updates: {
    phoneNumber?: string;
    dateOfBirth?: Date;
  },
): Promise<Voter> => {
  const voter = await Voter.findByPk(voterId);

  if (!voter) {
    throw new ApiError(404, 'Voter not found');
  }

  await voter.update(updates);

  return voter;
};

/**
 * Get voter's assigned polling unit
 */
export const getVoterPollingUnit = async (voterId: string): Promise<PollingUnit> => {
  const voter = await Voter.findByPk(voterId);

  if (!voter) {
    throw new ApiError(404, 'Voter not found');
  }

  const pollingUnit = await PollingUnit.findOne({
    where: { pollingUnitCode: voter.pollingUnitCode },
  });

  if (!pollingUnit) {
    throw new ApiError(404, 'Polling unit not assigned or found for voter');
  }

  return pollingUnit;
};

/**
 * Check voter eligibility for an election
 */
export const checkVoterEligibility = async (
  voterId: string,
  electionId: string,
): Promise<{
  isEligible: boolean;
  reason?: string;
}> => {
  try {
    // Find voter with verification status
    const voter = await Voter.findByPk(voterId, {
      include: [
        {
          model: VerificationStatus,
          as: 'verificationStatus',
          attributes: [
            'isPhoneVerified',
            'isEmailVerified',
            'isIdentityVerified',
            'isAddressVerified',
            'verificationLevel',
          ],
        },
      ],
    });

    if (!voter) {
      return {
        isEligible: false,
        reason: 'Voter not found',
      };
    }

    if (!voter.isActive) {
      return {
        isEligible: false,
        reason: 'Voter account is inactive',
      };
    }

    // Check verification status requirements
    const verificationStatus = voter.get('verificationStatus') as VerificationStatus | undefined;

    if (!verificationStatus) {
      return {
        isEligible: false,
        reason: 'Voter verification status not found',
      };
    }

    // Require minimum verification level (identity + phone)
    if (!verificationStatus.isIdentityVerified || !verificationStatus.isPhoneVerified) {
      return {
        isEligible: false,
        reason: 'Voter must complete identity and phone verification to be eligible',
      };
    }

    // Check if voter has already voted
    const hasVoted = await Vote.findOne({
      where: {
        userId: voterId,
        electionId,
      },
    });

    if (hasVoted) {
      return {
        isEligible: false,
        reason: 'Voter has already cast a vote in this election',
      };
    }

    return {
      isEligible: true,
      reason: 'Voter is eligible to vote',
    };
  } catch (error) {
    logger.error('Error in checkVoterEligibility:', error);
    throw error;
  }
};

/**
 * Request verification
 */
export const requestVerification = async (voterId: string): Promise<VerificationStatus> => {
  const [_verificationStatus] = await VerificationStatus.findOrCreate({
    where: { userId: voterId },
    defaults: { userId: voterId },
  });

  throw new Error('requestVerification service not implemented for new VerificationStatus model');
};

/**
 * Change voter password - Deprecated with new authentication system
 */
export const changePassword = (
  _voterId: string,
  _currentPassword: string,
  _newPassword: string,
): Promise<boolean> => {
  // Password-based authentication is no longer supported
  throw new ApiError(
    400,
    'Password-based authentication is no longer supported. Please use NIN/VIN authentication.',
  );
};

/**
 * Get voter public key
 */
export const getVoterPublicKey = async (voterId: string): Promise<string | null> => {
  const voter = await Voter.findByPk(voterId, {
    attributes: ['publicKey'],
  });

  if (!voter) {
    throw new ApiError(404, 'Voter not found');
  }

  return voter.publicKey || null;
};

/**
 * Get total voter count
 */
export const getVoterCount = async (): Promise<number> => {
  try {
    const count = await Voter.count({
      where: {
        isActive: true,
      },
    });
    return count;
  } catch (error) {
    logger.error('Error getting voter count:', error);
    return 0;
  }
};

/**
 * Get voter by NIN (National Identification Number)
 */
export const getVoterByNin = async (nin: string): Promise<any> => {
  try {
    // Encrypt the input NIN to match against stored encrypted value
    const ninEncrypted = encryptIdentity(nin);

    // Query directly using encrypted value
    const voter = await Voter.findOne({
      where: { ninEncrypted },
      include: [
        {
          model: PollingUnit,
          as: 'pollingUnit',
          attributes: ['id', 'pollingUnitName', 'pollingUnitCode', 'address', 'ward', 'lga'],
        },
      ],
    });

    if (!voter) {
      return null;
    }

    const pollingUnit = voter.get('pollingUnit') as PollingUnit | undefined;

    return {
      id: voter.id,
      nin: voter.decryptedNin,
      vin: voter.decryptedVin,
      fullName: voter.fullName,
      phoneNumber: voter.phoneNumber,
      pollingUnit: pollingUnit
        ? {
            id: pollingUnit.id,
            name: pollingUnit.pollingUnitName,
            code: pollingUnit.pollingUnitCode,
            address: pollingUnit.address,
            ward: pollingUnit.ward,
            lga: pollingUnit.lga,
          }
        : null,
    };
  } catch (error) {
    // Return null if encryption or lookup fails
    return null;
  }
};
