"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPendingVerifications = exports.rejectVerification = exports.approveVerification = exports.submitVerificationRequest = exports.getVerificationStatus = void 0;
const uuid_1 = require("uuid");
const VerificationStatus_1 = __importDefault(require("../db/models/VerificationStatus"));
const Voter_1 = __importDefault(require("../db/models/Voter"));
/**
 * Get verification status by voter ID
 */
const getVerificationStatus = async (voterId) => {
    const verificationStatus = await VerificationStatus_1.default.findOne({
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
exports.getVerificationStatus = getVerificationStatus;
/**
 * Submit verification request
 */
const submitVerificationRequest = async (voterId, documentType, documentNumber, documentImageUrl) => {
    // Check if voter exists
    const voter = await Voter_1.default.findByPk(voterId);
    if (!voter) {
        throw new Error('Voter not found');
    }
    // Find or create verification status
    const [verificationStatus, created] = await VerificationStatus_1.default.findOrCreate({
        where: { userId: voterId },
        defaults: {
            id: (0, uuid_1.v4)(),
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
exports.submitVerificationRequest = submitVerificationRequest;
/**
 * Approve verification request
 */
const approveVerification = async (verificationId, adminId, notes) => {
    const verificationStatus = await VerificationStatus_1.default.findByPk(verificationId);
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
exports.approveVerification = approveVerification;
/**
 * Reject verification request
 */
const rejectVerification = async (verificationId, adminId, reason) => {
    const verificationStatus = await VerificationStatus_1.default.findByPk(verificationId);
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
exports.rejectVerification = rejectVerification;
/**
 * Get pending verification requests with pagination
 */
const getPendingVerifications = async (page = 1, limit = 50) => {
    // Calculate pagination
    const offset = (page - 1) * limit;
    // Fetch pending verifications with pagination
    const { count, rows: verifications } = await VerificationStatus_1.default.findAndCountAll({
        where: {
            state: 'pending',
        },
        limit,
        offset,
        order: [['createdAt', 'ASC']],
        include: [
            {
                model: Voter_1.default,
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
exports.getPendingVerifications = getPendingVerifications;
//# sourceMappingURL=verificationService.js.map