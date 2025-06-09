"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSession = exports.endSession = exports.updateSessionState = exports.processUssdRequest = exports.verifyUssdSession = exports.createUssdSession = exports.verifyVote = exports.getSessionStatus = exports.castVote = exports.startSession = void 0;
const UssdSession_1 = __importStar(require("../db/models/UssdSession"));
const UssdVote_1 = __importDefault(require("../db/models/UssdVote"));
const Voter_1 = __importDefault(require("../db/models/Voter"));
const Election_1 = __importDefault(require("../db/models/Election"));
const Candidate_1 = __importDefault(require("../db/models/Candidate"));
const sequelize_1 = require("sequelize");
const errorHandler_1 = require("../middleware/errorHandler");
/**
 * Generate a random session code
 */
const generateSessionCode = () => {
    // Generate a 6-digit random code
    return Math.floor(100000 + Math.random() * 900000).toString();
};
/**
 * Generate a receipt code for vote verification
 */
const generateConfirmationCode = () => {
    // Generate a 6-digit random code for confirmation (example)
    return Math.floor(100000 + Math.random() * 900000).toString();
};
/**
 * Start a new USSD session
 */
const startSession = async (nin, vin, phoneNumber) => {
    // Verify voter credentials
    const voter = await Voter_1.default.findOne({
        where: {
            nin,
            vin,
            phoneNumber,
        },
    });
    if (!voter) {
        throw new errorHandler_1.ApiError(401, 'Invalid voter credentials');
    }
    // Check if voter already has an active session
    const existingSession = await UssdSession_1.default.findOne({
        where: {
            phoneNumber,
            isActive: true,
            expiresAt: {
                [sequelize_1.Op.gt]: new Date(),
            },
        },
    });
    if (existingSession) {
        // Return existing session
        return {
            sessionCode: existingSession.sessionCode,
            expiresAt: existingSession.expiresAt,
        };
    }
    // Generate a new session code
    const sessionCode = generateSessionCode();
    // Set expiration time (e.g., 15 minutes from now - consistent with model hook?)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);
    // Create a new session
    const session = await UssdSession_1.default.create({
        userId: voter.id,
        sessionCode,
        phoneNumber,
        sessionStatus: UssdSession_1.UssdSessionStatus.AUTHENTICATED,
        expiresAt,
    });
    return {
        sessionCode: session.sessionCode,
        expiresAt: session.expiresAt,
    };
};
exports.startSession = startSession;
/**
 * Cast a vote via USSD
 */
const castVote = async (sessionCode, electionId, candidateId) => {
    // Find the session
    const session = await UssdSession_1.default.findOne({
        where: {
            sessionCode,
            isActive: true,
            expiresAt: {
                [sequelize_1.Op.gt]: new Date(),
            },
        },
    });
    if (!session || !session.userId) {
        // Ensure session exists and has an associated user ID
        throw new errorHandler_1.ApiError(404, 'Invalid or expired session, or user not found');
    }
    const userId = session.userId; // Get userId from the session
    // Verify the election exists
    const election = await Election_1.default.findByPk(electionId);
    if (!election) {
        throw new errorHandler_1.ApiError(404, 'Election not found');
    }
    // Verify the candidate exists and is part of the election
    const candidate = await Candidate_1.default.findOne({
        where: {
            id: candidateId,
            electionId,
            isActive: true, // Check if candidate is active
        },
    });
    if (!candidate) {
        throw new errorHandler_1.ApiError(400, 'Candidate not found or not active for this election');
    }
    // Check if voter has already voted in this election
    const existingVote = await UssdVote_1.default.findOne({
        where: {
            userId: userId,
            electionId,
        },
    });
    if (existingVote) {
        throw new errorHandler_1.ApiError(409, 'You have already voted in this election');
    }
    // Generate a confirmation code
    const confirmationCode = generateConfirmationCode();
    // Create the vote record - Ensure it matches the UssdVote model
    const vote = await UssdVote_1.default.create({
        sessionCode: session.sessionCode,
        userId: userId,
        electionId,
        candidateId,
        confirmationCode,
    });
    // Update session status
    await session.update({
        sessionStatus: UssdSession_1.UssdSessionStatus.VOTE_CONFIRMED,
        sessionData: {
            ...(session.sessionData || {}),
            confirmationCode,
            voteId: vote.id,
        },
    });
    return {
        confirmationCode,
    };
};
exports.castVote = castVote;
/**
 * Get session status
 */
const getSessionStatus = async (sessionCode) => {
    // Find the session
    const session = await UssdSession_1.default.findOne({
        where: {
            sessionCode,
        },
    });
    if (!session) {
        throw new errorHandler_1.ApiError(404, 'Session not found');
    }
    return {
        status: session.sessionStatus,
        userId: session.userId,
        expiresAt: session.expiresAt,
        lastActivity: session.lastActivity,
    };
};
exports.getSessionStatus = getSessionStatus;
/**
 * Verify a vote using confirmation code (Note: USSD votes might not be verifiable this way)
 * This logic seems flawed as receiptCode was generated randomly and stored in sessionData
 * A better approach might be to verify based on userId and electionId
 */
const verifyVote = async (confirmationCode, phoneNumber) => {
    // Find the session associated with the phone number where sessionData contains the code
    const session = await UssdSession_1.default.findOne({
        where: {
            phoneNumber,
            sessionData: {
                [sequelize_1.Op.contains]: { confirmationCode },
            },
        },
    });
    if (!session || !session.sessionData?.voteId) {
        throw new errorHandler_1.ApiError(404, 'No matching confirmed vote session found for this phone and code');
    }
    // Get the vote using the ID stored in the session
    const vote = await UssdVote_1.default.findByPk(session.sessionData.voteId);
    if (!vote) {
        throw new errorHandler_1.ApiError(500, 'Associated vote record not found');
    }
    // Get election and candidate details (optional, based on return needs)
    const election = await Election_1.default.findByPk(vote.electionId);
    const candidate = await Candidate_1.default.findByPk(vote.candidateId);
    // Mark vote as processed (if not already)
    if (!vote.isProcessed) {
        await vote.update({
            isProcessed: true,
            processedAt: new Date(),
        });
    }
    return {
        isProcessed: vote.isProcessed,
        processedAt: vote.processedAt,
        electionName: election?.electionName,
        candidateName: candidate?.fullName,
        voteTimestamp: vote.voteTimestamp,
    };
};
exports.verifyVote = verifyVote;
// In-memory storage for USSD sessions (in a real app, this would be in a database)
const ussdSessions = {};
/**
 * Create a USSD session
 */
const createUssdSession = (userId, phoneNumber) => {
    // Generate a random 6-digit session code
    const sessionCode = Math.floor(100000 + Math.random() * 900000).toString();
    // Store the session with a 10-minute expiry
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes
    ussdSessions[sessionCode] = {
        userId,
        phoneNumber,
        createdAt: now,
        expiresAt,
    };
    return Promise.resolve(sessionCode);
};
exports.createUssdSession = createUssdSession;
/**
 * Verify a USSD session
 */
const verifyUssdSession = (sessionCode, phoneNumber) => {
    const session = ussdSessions[sessionCode];
    if (!session) {
        return null;
    }
    // Check if session has expired
    if (new Date() > session.expiresAt) {
        delete ussdSessions[sessionCode]; // Clean up expired session
        return null;
    }
    // Check if phone number matches
    if (session.phoneNumber !== phoneNumber) {
        return null;
    }
    return session;
};
exports.verifyUssdSession = verifyUssdSession;
/**
 * Process USSD request
 */
const processUssdRequest = (sessionId, serviceCode, phoneNumber, text) => {
    // This is a simplified implementation of a USSD menu system
    // In a real application, this would be more sophisticated
    // Initial menu (no text input yet)
    if (!text) {
        return `CON Welcome to the E-Voting System
1. Authenticate to vote
2. Check voting status
3. Verify vote
4. Exit`;
    }
    // Process menu options
    const textParts = text.split('*');
    const currentOption = textParts[textParts.length - 1];
    // Main menu options
    if (textParts.length === 1) {
        switch (currentOption) {
            case '1':
                return `CON Enter your NIN:`;
            case '2':
                return `CON Enter your VIN to check voting status:`;
            case '3':
                return `CON Enter your receipt code to verify your vote:`;
            case '4':
                return `END Thank you for using the E-Voting System.`;
            default:
                return `END Invalid option selected.`;
        }
    }
    // Authentication flow
    if (textParts[0] === '1') {
        // NIN entered
        if (textParts.length === 2) {
            return `CON Enter your VIN:`;
        }
        // VIN entered
        else if (textParts.length === 3) {
            // In a real implementation, this would verify the NIN and VIN
            // For now, just returning a mock session code
            const sessionCode = Math.floor(100000 + Math.random() * 900000).toString();
            return `END Authentication successful. Your session code is: ${sessionCode}. This code is valid for 10 minutes.`;
        }
    }
    // Voting status check
    if (textParts[0] === '2' && textParts.length === 2) {
        // In a real implementation, this would check the voting status
        return `END You have not yet voted in the current election.`;
    }
    // Vote verification
    if (textParts[0] === '3' && textParts.length === 2) {
        // In a real implementation, this would verify the vote
        return `END Your vote has been verified. It was cast on 2023-02-25 at 10:30 AM.`;
    }
    return `END Invalid input. Please try again.`;
};
exports.processUssdRequest = processUssdRequest;
/**
 * Update session state
 */
const updateSessionState = async (sessionId, newState) => {
    const session = await UssdSession_1.default.findOne({
        where: { sessionCode: sessionId },
    });
    if (!session) {
        throw new errorHandler_1.ApiError(404, 'Session not found');
    }
    await session.update({
        sessionData: newState,
        lastActivity: new Date(),
    });
};
exports.updateSessionState = updateSessionState;
/**
 * End USSD session
 */
const endSession = async (sessionId) => {
    const session = await UssdSession_1.default.findOne({
        where: { sessionCode: sessionId },
    });
    if (!session) {
        throw new errorHandler_1.ApiError(404, 'Session not found');
    }
    await session.update({
        isActive: false,
        sessionStatus: UssdSession_1.UssdSessionStatus.COMPLETED,
        lastActivity: new Date(),
    });
};
exports.endSession = endSession;
/**
 * Get session by session ID
 */
const getSession = async (sessionId) => {
    const session = await UssdSession_1.default.findOne({
        where: { sessionCode: sessionId },
    });
    if (!session) {
        return null;
    }
    return {
        sessionCode: session.sessionCode,
        userId: session.userId,
        sessionData: session.sessionData,
        isActive: session.isActive,
        expiresAt: session.expiresAt,
        lastActivity: session.lastActivity,
    };
};
exports.getSession = getSession;
//# sourceMappingURL=ussdService.js.map