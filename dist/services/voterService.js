"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVoterByNin = exports.getVoterPublicKey = exports.changePassword = exports.requestVerification = exports.checkVoterEligibility = exports.getVoterPollingUnit = exports.updateVoterProfile = exports.getVoterProfile = void 0;
const Voter_1 = __importDefault(require("../db/models/Voter"));
const VerificationStatus_1 = __importDefault(require("../db/models/VerificationStatus"));
const PollingUnit_1 = __importDefault(require("../db/models/PollingUnit"));
const Vote_1 = __importDefault(require("../db/models/Vote"));
const errorHandler_1 = require("../middleware/errorHandler");
const encryptionService_1 = require("./encryptionService");
const logger_1 = require("../config/logger");
/**
 * Get voter profile by ID
 */
const getVoterProfile = async (voterId) => {
    const voter = await Voter_1.default.findByPk(voterId, {
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
                model: VerificationStatus_1.default,
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
                model: PollingUnit_1.default,
                as: 'pollingUnit',
                attributes: ['id', 'pollingUnitName', 'pollingUnitCode', 'address'],
            },
        ],
    });
    if (!voter) {
        throw new errorHandler_1.ApiError(404, 'Voter not found');
    }
    const verificationStatus = voter.get('verificationStatus');
    const pollingUnit = voter.get('pollingUnit');
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
exports.getVoterProfile = getVoterProfile;
/**
 * Update voter profile
 */
const updateVoterProfile = async (voterId, updates) => {
    const voter = await Voter_1.default.findByPk(voterId);
    if (!voter) {
        throw new errorHandler_1.ApiError(404, 'Voter not found');
    }
    await voter.update(updates);
    return voter;
};
exports.updateVoterProfile = updateVoterProfile;
/**
 * Get voter's assigned polling unit
 */
const getVoterPollingUnit = async (voterId) => {
    const voter = await Voter_1.default.findByPk(voterId);
    if (!voter) {
        throw new errorHandler_1.ApiError(404, 'Voter not found');
    }
    const pollingUnit = await PollingUnit_1.default.findOne({
        where: { pollingUnitCode: voter.pollingUnitCode },
    });
    if (!pollingUnit) {
        throw new errorHandler_1.ApiError(404, 'Polling unit not assigned or found for voter');
    }
    return pollingUnit;
};
exports.getVoterPollingUnit = getVoterPollingUnit;
/**
 * Check voter eligibility for an election
 */
const checkVoterEligibility = async (voterId, electionId) => {
    try {
        // Find voter with verification status
        const voter = await Voter_1.default.findByPk(voterId, {
            include: [
                {
                    model: VerificationStatus_1.default,
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
        const verificationStatus = voter.get('verificationStatus');
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
        const hasVoted = await Vote_1.default.findOne({
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
    }
    catch (error) {
        logger_1.logger.error('Error in checkVoterEligibility:', error);
        throw error;
    }
};
exports.checkVoterEligibility = checkVoterEligibility;
/**
 * Request verification
 */
const requestVerification = async (voterId) => {
    const [_verificationStatus] = await VerificationStatus_1.default.findOrCreate({
        where: { userId: voterId },
        defaults: { userId: voterId },
    });
    throw new Error('requestVerification service not implemented for new VerificationStatus model');
};
exports.requestVerification = requestVerification;
/**
 * Change voter password - Deprecated with new authentication system
 */
const changePassword = (_voterId, _currentPassword, _newPassword) => {
    // Password-based authentication is no longer supported
    throw new errorHandler_1.ApiError(400, 'Password-based authentication is no longer supported. Please use NIN/VIN authentication.');
};
exports.changePassword = changePassword;
/**
 * Get voter public key
 */
const getVoterPublicKey = async (voterId) => {
    const voter = await Voter_1.default.findByPk(voterId, {
        attributes: ['publicKey'],
    });
    if (!voter) {
        throw new errorHandler_1.ApiError(404, 'Voter not found');
    }
    return voter.publicKey || null;
};
exports.getVoterPublicKey = getVoterPublicKey;
/**
 * Get voter by NIN (National Identification Number)
 */
const getVoterByNin = async (nin) => {
    try {
        // Encrypt the input NIN to match against stored encrypted value
        const ninEncrypted = (0, encryptionService_1.encryptIdentity)(nin);
        // Query directly using encrypted value
        const voter = await Voter_1.default.findOne({
            where: { ninEncrypted },
            include: [
                {
                    model: PollingUnit_1.default,
                    as: 'pollingUnit',
                    attributes: ['id', 'pollingUnitName', 'pollingUnitCode', 'address', 'ward', 'lga'],
                },
            ],
        });
        if (!voter) {
            return null;
        }
        const pollingUnit = voter.get('pollingUnit');
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
    }
    catch (error) {
        // Return null if encryption or lookup fails
        return null;
    }
};
exports.getVoterByNin = getVoterByNin;
//# sourceMappingURL=voterService.js.map