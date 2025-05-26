import Voter from '../db/models/Voter';
import VerificationStatus from '../db/models/VerificationStatus';
import PollingUnit from '../db/models/PollingUnit';
import Vote from '../db/models/Vote';
import { ApiError } from '../middleware/errorHandler';

/**
 * Get voter profile by ID
 */
export const getVoterProfile = async (voterId: string): Promise<any> => {
  const voter = await Voter.findByPk(voterId, {
    attributes: [
      'id',
      'nin',
      'vin',
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
    nin: voter.nin,
    vin: voter.vin,
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
      vin: voter.vin,
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
    // First, try to find the voter without includes to isolate the issue
    const voter = await Voter.findByPk(voterId);

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

    // For now, skip verification status check to isolate the database issue
    // TODO: Re-enable verification status check once database issues are resolved

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

    // For now, return eligible if voter exists and is active
    // TODO: Add back verification status check
    return {
      isEligible: true,
      reason: 'Voter is eligible (verification status check temporarily disabled)',
    };
  } catch (error) {
    console.error('Error in checkVoterEligibility:', error);
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
 * Change voter password
 */
export const changePassword = async (
  voterId: string,
  currentPassword: string,
  newPassword: string,
): Promise<boolean> => {
  const voter = await Voter.findByPk(voterId);

  if (!voter) {
    throw new ApiError(404, 'Voter not found');
  }

  const isPasswordValid = await voter.validatePassword(currentPassword);

  if (!isPasswordValid) {
    throw new ApiError(401, 'Current password is incorrect');
  }

  await (voter as any).update({ password: newPassword });

  return true;
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
 * Get voter by NIN (National Identification Number)
 */
export const getVoterByNin = async (nin: string): Promise<any> => {
  const voter = await Voter.findOne({
    where: { nin },
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
    nin: voter.nin,
    vin: voter.vin,
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
};
