import Voter from '../db/models/Voter';
import VoterCard from '../db/models/VoterCard';
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
        model: VoterCard,
        as: 'voterCard',
        attributes: ['id', 'vin', 'issuedDate', 'isValid', 'pollingUnitCode'],
        include: [
          {
            model: PollingUnit,
            as: 'polling_unit',
            attributes: ['id', 'pollingUnitName', 'pollingUnitCode', 'address'],
          },
        ],
      },
    ],
  });

  if (!voter) {
    throw new ApiError(404, 'Voter not found');
  }

  const verificationStatus = voter.get('verificationStatus') as VerificationStatus | undefined;
  const voterCard = voter.get('voterCard') as VoterCard | undefined;
  const pollingUnit = voterCard?.get('polling_unit') as PollingUnit | undefined;

  return {
    id: voter.id,
    nin: voter.nin,
    vin: voter.vin,
    phoneNumber: voter.phoneNumber,
    dateOfBirth: voter.dateOfBirth,
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
    voterCard: voterCard
      ? {
          id: voterCard.id,
          vin: voterCard.vin,
          issued: voterCard.issuedDate,
          valid: voterCard.isValid,
          pollingUnitCode: voterCard.pollingUnitCode,
          pollingUnit: pollingUnit
            ? {
                id: pollingUnit.id,
                name: pollingUnit.pollingUnitName,
                code: pollingUnit.pollingUnitCode,
                address: pollingUnit.address,
              }
            : null,
        }
      : null,
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
  const voterCard = await VoterCard.findOne({
    where: { userId: voterId },
    include: [
      {
        model: PollingUnit,
        as: 'polling_unit',
        required: true,
      },
    ],
  });

  const pollingUnit = voterCard?.get('polling_unit') as PollingUnit | undefined;

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
  const voter = await Voter.findByPk(voterId, {
    include: [
      {
        model: VerificationStatus,
        as: 'verificationStatus',
        required: false,
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

  const verificationStatus = voter.get('verificationStatus') as VerificationStatus | undefined;

  if (!verificationStatus || !verificationStatus.isIdentityVerified) {
    return {
      isEligible: false,
      reason: 'Voter identity not verified',
    };
  }

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
  };
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
export const getVoterPublicKey = async (userId: string): Promise<string | null> => {
  const voter = await Voter.findByPk(userId, {
    attributes: ['publicKey'],
  });

  if (!voter) {
    throw new ApiError(404, 'Voter not found');
  }

  return voter.publicKey ?? null;
};
