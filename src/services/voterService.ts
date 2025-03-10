import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';
import Voter from '../db/models/Voter';
import VoterCard from '../db/models/VoterCard';
import VerificationStatus from '../db/models/VerificationStatus';
import PollingUnit from '../db/models/PollingUnit';
import Vote from '../db/models/Vote';

/**
 * Get voter profile by ID
 */
export const getVoterProfile = async (voterId: string): Promise<any> => {
  const voter = await Voter.findByPk(voterId, {
    attributes: ['id', 'nin', 'vin', 'phoneNumber', 'dateOfBirth', 'isActive', 'createdAt', 'lastLogin'],
    include: [
      {
        model: VerificationStatus,
        as: 'verificationStatus',
        attributes: ['isVerified', 'state', 'verificationDate']
      },
      {
        model: VoterCard,
        as: 'voterCard',
        attributes: ['id', 'cardNumber', 'issueDate', 'expiryDate'],
        include: [
          {
            model: PollingUnit,
            as: 'pollingUnit',
            attributes: ['id', 'name', 'code', 'address']
          }
        ]
      }
    ]
  });

  if (!voter) {
    throw new Error('Voter not found');
  }

  return voter;
};

/**
 * Update voter profile
 */
export const updateVoterProfile = async (
  voterId: string,
  updates: {
    phoneNumber?: string;
    dateOfBirth?: Date;
  }
): Promise<any> => {
  const voter = await Voter.findByPk(voterId);

  if (!voter) {
    throw new Error('Voter not found');
  }

  // Update only allowed fields
  if (updates.phoneNumber) {
    voter.phoneNumber = updates.phoneNumber;
  }

  if (updates.dateOfBirth) {
    voter.dateOfBirth = updates.dateOfBirth;
  }

  await voter.save();

  return {
    id: voter.id,
    nin: voter.nin,
    vin: voter.vin,
    phoneNumber: voter.phoneNumber,
    dateOfBirth: voter.dateOfBirth,
    isActive: voter.isActive,
    lastLogin: voter.lastLogin
  };
};

/**
 * Get voter's assigned polling unit
 */
export const getVoterPollingUnit = async (voterId: string): Promise<any> => {
  const voterCard = await VoterCard.findOne({
    where: { userId: voterId },
    include: [
      {
        model: PollingUnit,
        as: 'pollingUnit'
      }
    ]
  });

  if (!voterCard || !voterCard.get('pollingUnit')) {
    throw new Error('Polling unit not assigned');
  }

  return voterCard.get('pollingUnit');
};

/**
 * Check voter eligibility for an election
 */
export const checkVoterEligibility = async (
  voterId: string,
  electionId: string
): Promise<{
  isEligible: boolean;
  reason?: string;
}> => {
  // Get voter
  const voter = await Voter.findByPk(voterId, {
    include: [
      {
        model: VerificationStatus,
        as: 'verificationStatus'
      }
    ]
  });
  
  if (!voter) {
    return {
      isEligible: false,
      reason: 'Voter not found'
    };
  }
  
  // Check if voter is active
  if (!voter.isActive) {
    return {
      isEligible: false,
      reason: 'Voter account is inactive'
    };
  }
  
  // Check if voter is verified
  const verificationStatus = await VerificationStatus.findOne({
    where: { userId: voterId }
  });
  
  if (!verificationStatus || !verificationStatus.isVerified) {
    return {
      isEligible: false,
      reason: 'Voter is not verified'
    };
  }
  
  // Check if voter has already voted in this election
  const hasVoted = await Vote.findOne({
    where: {
      userId: voterId,
      electionId
    }
  });
  
  if (hasVoted) {
    return {
      isEligible: false,
      reason: 'Voter has already cast a vote in this election'
    };
  }
  
  return {
    isEligible: true
  };
};

/**
 * Request verification
 */
export const requestVerification = async (
  voterId: string,
  documentType: string,
  documentNumber: string,
  documentImageUrl: string
): Promise<any> => {
  // Find or create verification status
  const [verificationStatus, created] = await VerificationStatus.findOrCreate({
    where: { userId: voterId },
    defaults: {
      id: uuidv4(),
      userId: voterId,
      isVerified: false,
      state: 'pending',
      verificationData: {
        documentType,
        documentNumber,
        documentImageUrl,
        submittedAt: new Date()
      }
    }
  });
  
  // If verification status already exists, update it
  if (!created) {
    await verificationStatus.update({
      state: 'pending',
      verificationData: {
        ...verificationStatus.verificationData,
        documentType,
        documentNumber,
        documentImageUrl,
        updatedAt: new Date()
      }
    });
  }
  
  return {
    id: verificationStatus.id,
    state: verificationStatus.state,
    isVerified: verificationStatus.isVerified,
    submittedAt: created ? new Date() : verificationStatus.updatedAt
  };
};

/**
 * Change voter password
 */
export const changePassword = async (
  voterId: string,
  currentPassword: string,
  newPassword: string
): Promise<boolean> => {
  // Find voter
  const voter = await Voter.findByPk(voterId);
  
  if (!voter) {
    throw new Error('Voter not found');
  }
  
  // Validate current password
  const isPasswordValid = await voter.validatePassword(currentPassword);
  
  if (!isPasswordValid) {
    throw new Error('Current password is incorrect');
  }
  
  // Update password
  await voter.updatePassword(newPassword);
  
  return true;
};
