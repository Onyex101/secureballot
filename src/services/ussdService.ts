import UssdSession, { UssdSessionStatus } from '../db/models/UssdSession';
import UssdVote from '../db/models/UssdVote';
import Voter from '../db/models/Voter';
import Election from '../db/models/Election';
import Candidate from '../db/models/Candidate';
import { Op } from 'sequelize';
import { ApiError } from '../middleware/errorHandler';

/**
 * Generate a random session code
 */
const generateSessionCode = (): string => {
  // Generate a 6-digit random code
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Generate a receipt code for vote verification
 */
const generateConfirmationCode = (): string => {
  // Generate a 6-digit random code for confirmation (example)
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Start a new USSD session
 */
export const startSession = async (
  nin: string,
  vin: string,
  phoneNumber: string,
): Promise<{ sessionCode: string; expiresAt: Date }> => {
  // Verify voter credentials
  const voter = await Voter.findOne({
    where: {
      nin,
      vin,
      phoneNumber,
    },
  });

  if (!voter) {
    throw new ApiError(401, 'Invalid voter credentials');
  }

  // Check if voter already has an active session
  const existingSession = await UssdSession.findOne({
    where: {
      phoneNumber,
      isActive: true,
      expiresAt: {
        [Op.gt]: new Date(),
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
  const session = await UssdSession.create({
    userId: voter.id,
    sessionCode,
    phoneNumber,
    sessionStatus: UssdSessionStatus.AUTHENTICATED,
    expiresAt,
  });

  return {
    sessionCode: session.sessionCode,
    expiresAt: session.expiresAt,
  };
};

/**
 * Cast a vote via USSD
 */
export const castVote = async (
  sessionCode: string,
  electionId: string,
  candidateId: string,
): Promise<{ confirmationCode: string }> => {
  // Find the session
  const session = await UssdSession.findOne({
    where: {
      sessionCode,
      isActive: true,
      expiresAt: {
        [Op.gt]: new Date(),
      },
    },
  });

  if (!session || !session.userId) {
    // Ensure session exists and has an associated user ID
    throw new ApiError(404, 'Invalid or expired session, or user not found');
  }
  const userId = session.userId; // Get userId from the session

  // Verify the election exists
  const election = await Election.findByPk(electionId);
  if (!election) {
    throw new ApiError(404, 'Election not found');
  }

  // Verify the candidate exists and is part of the election
  const candidate = await Candidate.findOne({
    where: {
      id: candidateId,
      electionId,
      isActive: true, // Check if candidate is active
    },
  });

  if (!candidate) {
    throw new ApiError(400, 'Candidate not found or not active for this election');
  }

  // Check if voter has already voted in this election
  const existingVote = await UssdVote.findOne({
    where: {
      userId: userId,
      electionId,
    },
  });

  if (existingVote) {
    throw new ApiError(409, 'You have already voted in this election');
  }

  // Generate a confirmation code
  const confirmationCode = generateConfirmationCode();

  // Create the vote record - Ensure it matches the UssdVote model
  const vote = await UssdVote.create({
    sessionCode: session.sessionCode,
    userId: userId,
    electionId,
    candidateId,
    confirmationCode,
  });

  // Update session status
  await session.update({
    sessionStatus: UssdSessionStatus.VOTE_CONFIRMED,
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

/**
 * Get session status
 */
export const getSessionStatus = async (
  sessionCode: string,
): Promise<{
  status: UssdSessionStatus;
  userId: string | null;
  expiresAt: Date;
  lastActivity: Date;
}> => {
  // Find the session
  const session = await UssdSession.findOne({
    where: {
      sessionCode,
    },
  });

  if (!session) {
    throw new ApiError(404, 'Session not found');
  }

  return {
    status: session.sessionStatus,
    userId: session.userId,
    expiresAt: session.expiresAt,
    lastActivity: session.lastActivity,
  };
};

/**
 * Verify a vote using confirmation code (Note: USSD votes might not be verifiable this way)
 * This logic seems flawed as receiptCode was generated randomly and stored in sessionData
 * A better approach might be to verify based on userId and electionId
 */
export const verifyVote = async (
  confirmationCode: string,
  phoneNumber: string,
): Promise<{
  isProcessed: boolean;
  processedAt?: Date | null;
  electionName?: string;
  candidateName?: string;
  voteTimestamp?: Date;
}> => {
  // Find the session associated with the phone number where sessionData contains the code
  const session = await UssdSession.findOne({
    where: {
      phoneNumber,
      sessionData: {
        [Op.contains]: { confirmationCode },
      },
    },
  });

  if (!session || !session.sessionData?.voteId) {
    throw new ApiError(404, 'No matching confirmed vote session found for this phone and code');
  }

  // Get the vote using the ID stored in the session
  const vote = await UssdVote.findByPk(session.sessionData.voteId);
  if (!vote) {
    throw new ApiError(500, 'Associated vote record not found');
  }

  // Get election and candidate details (optional, based on return needs)
  const election = await Election.findByPk(vote.electionId);
  const candidate = await Candidate.findByPk(vote.candidateId);

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

// In-memory storage for USSD sessions (in a real app, this would be in a database)
const ussdSessions: {
  [sessionCode: string]: {
    userId: string;
    phoneNumber: string;
    createdAt: Date;
    expiresAt: Date;
  };
} = {};

/**
 * Create a USSD session
 */
export const createUssdSession = (userId: string, phoneNumber: string): Promise<string> => {
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

/**
 * Verify a USSD session
 */
export const verifyUssdSession = (sessionCode: string, phoneNumber: string) => {
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

/**
 * Process USSD request
 */
export const processUssdRequest = (
  sessionId: string,
  serviceCode: string,
  phoneNumber: string,
  text: string,
) => {
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

/**
 * Update session state
 */
export const updateSessionState = async (sessionId: string, newState: any): Promise<void> => {
  const session = await UssdSession.findOne({
    where: { sessionCode: sessionId },
  });

  if (!session) {
    throw new ApiError(404, 'Session not found');
  }

  await session.update({
    sessionData: newState,
    lastActivity: new Date(),
  });
};

/**
 * End USSD session
 */
export const endSession = async (sessionId: string): Promise<void> => {
  const session = await UssdSession.findOne({
    where: { sessionCode: sessionId },
  });

  if (!session) {
    throw new ApiError(404, 'Session not found');
  }

  await session.update({
    isActive: false,
    sessionStatus: UssdSessionStatus.COMPLETED,
    lastActivity: new Date(),
  });
};

/**
 * Get session by session ID
 */
export const getSession = async (sessionId: string): Promise<any> => {
  const session = await UssdSession.findOne({
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
