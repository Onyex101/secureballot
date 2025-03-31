import { v4 as uuidv4 } from 'uuid';
import VerificationStatus from '../db/models/VerificationStatus';
import Voter from '../db/models/Voter';

/**
 * Get verification status by voter ID
 */
export const getVerificationStatus = async (voterId: string): Promise<any> => {
  const verificationStatus = await VerificationStatus.findOne({
    where: { userId: voterId },
  });

  if (!verificationStatus) {
    throw new Error('Verification status not found');
  }

  return {
    id: verificationStatus.id,
    isVerified: verificationStatus.isVerified,
    state: verificationStatus.state,
    verificationDate: verificationStatus.verifiedAt,
    verificationMethod: verificationStatus.verificationMethod,
  };
};

/**
 * Submit verification request
 */
export const submitVerificationRequest = async (
  voterId: string,
  documentType: string,
  documentNumber: string,
  documentImageUrl: string,
): Promise<any> => {
  // Check if voter exists
  const voter = await Voter.findByPk(voterId);
  if (!voter) {
    throw new Error('Voter not found');
  }

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
        submissionDate: new Date(),
      },
    },
  });

  // If not created, update the existing record
  if (!created) {
    await verificationStatus.update({
      state: 'pending',
      verificationData: {
        ...verificationStatus.verificationData,
        documentType,
        documentNumber,
        documentImageUrl,
        submissionDate: new Date(),
      },
    });
  }

  return {
    id: verificationStatus.id,
    state: verificationStatus.state,
    isVerified: verificationStatus.isVerified,
    submissionDate: new Date(),
  };
};

/**
 * Approve verification request
 */
export const approveVerification = async (
  verificationId: string,
  adminId: string,
  notes?: string,
): Promise<any> => {
  const verificationStatus = await VerificationStatus.findByPk(verificationId);

  if (!verificationStatus) {
    throw new Error('Verification status not found');
  }

  // Update verification status
  await verificationStatus.update({
    isVerified: true,
    state: 'approved',
    verifiedAt: new Date(),
    verificationMethod: 'document_verification',
    verificationData: {
      ...verificationStatus.verificationData,
      approvedBy: adminId,
      approvalDate: new Date(),
      notes,
    },
  });

  return {
    id: verificationStatus.id,
    isVerified: true,
    state: 'approved',
    verificationDate: new Date(),
  };
};

/**
 * Reject verification request
 */
export const rejectVerification = async (
  verificationId: string,
  adminId: string,
  reason: string,
): Promise<any> => {
  const verificationStatus = await VerificationStatus.findByPk(verificationId);

  if (!verificationStatus) {
    throw new Error('Verification status not found');
  }

  // Update verification status
  await verificationStatus.update({
    isVerified: false,
    state: 'rejected',
    verificationData: {
      ...verificationStatus.verificationData,
      rejectedBy: adminId,
      rejectionDate: new Date(),
      rejectionReason: reason,
    },
  });

  return {
    id: verificationStatus.id,
    isVerified: false,
    state: 'rejected',
    rejectionReason: reason,
  };
};

/**
 * Get pending verification requests with pagination
 */
export const getPendingVerifications = async (
  page: number = 1,
  limit: number = 50,
): Promise<{
  verifications: any[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}> => {
  // Calculate pagination
  const offset = (page - 1) * limit;

  // Fetch pending verifications with pagination
  const { count, rows: verifications } = await VerificationStatus.findAndCountAll({
    where: {
      state: 'pending',
    },
    limit,
    offset,
    order: [['createdAt', 'ASC']],
    include: [
      {
        model: Voter,
        as: 'voter',
        attributes: ['id', 'nin', 'vin', 'phoneNumber'],
      },
    ],
  });

  // Calculate pagination metadata
  const totalPages = Math.ceil(count / limit);

  return {
    verifications,
    pagination: {
      total: count,
      page,
      limit,
      totalPages,
    },
  };
};
