import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import UssdSession, { UssdSessionStatus } from '../db/models/UssdSession';
import UssdVote from '../db/models/UssdVote';
import Voter from '../db/models/Voter';
import Election from '../db/models/Election';
import Candidate from '../db/models/Candidate';
import { Op } from 'sequelize';

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
const generateReceiptCode = (): string => {
  // Generate a 16-character alphanumeric code
  return crypto.randomBytes(8).toString('hex');
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
    throw new Error('Invalid voter credentials');
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

  // Set expiration time (30 minutes from now)
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 30);

  // Create a new session
  const session = await UssdSession.create({
    id: uuidv4(),
    userId: voter.id,
    sessionCode,
    phoneNumber,
    sessionStatus: UssdSessionStatus.AUTHENTICATED,
    expiresAt,
    isActive: true,
    lastActivity: new Date(),
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
): Promise<{ receiptCode: string }> => {
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

  if (!session) {
    throw new Error('Invalid or expired session');
  }

  // Verify the election exists
  const election = await Election.findByPk(electionId);
  if (!election) {
    throw new Error('Election not found');
  }

  // Verify the candidate exists and is part of the election
  const candidate = await Candidate.findOne({
    where: {
      id: candidateId,
      electionId,
    },
  });

  if (!candidate) {
    throw new Error('Candidate not found or not part of this election');
  }

  // Check if voter has already voted in this election
  const existingVote = await UssdVote.findOne({
    where: {
      sessionId: session.id,
      electionId,
    },
  });

  if (existingVote) {
    throw new Error('You have already voted in this election');
  }

  // Generate a receipt code
  const receiptCode = generateReceiptCode();

  // Create the vote record
  const vote = await UssdVote.create({
    id: uuidv4(),
    sessionId: session.id,
    electionId,
    candidateId,
    voteTimestamp: new Date(),
    isVerified: false,
    isCounted: true,
  });

  // Update session status
  await session.update({
    sessionStatus: UssdSessionStatus.VOTE_CONFIRMED,
    lastActivity: new Date(),
    sessionData: {
      ...session.sessionData,
      receiptCode,
      voteId: vote.id,
    },
  });

  return {
    receiptCode,
  };
};

/**
 * Get session status
 */
export const getSessionStatus = async (
  sessionCode: string,
): Promise<{
  status: string;
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
    throw new Error('Session not found');
  }

  return {
    status: session.sessionStatus,
    userId: session.userId,
    expiresAt: session.expiresAt,
    lastActivity: session.lastActivity,
  };
};

/**
 * Verify a vote using receipt code
 */
export const verifyVote = async (
  receiptCode: string,
  phoneNumber: string,
): Promise<{
  isVerified: boolean;
  electionName?: string;
  candidateName?: string;
  voteTimestamp?: Date;
}> => {
  // Find the session with this receipt code
  const session = await UssdSession.findOne({
    where: {
      phoneNumber,
      sessionData: {
        receiptCode,
      },
    },
  });

  if (!session || !session.sessionData || !session.sessionData.voteId) {
    throw new Error('Invalid receipt code or phone number');
  }

  // Get the vote
  const vote = await UssdVote.findByPk(session.sessionData.voteId);
  if (!vote) {
    throw new Error('Vote not found');
  }

  // Get election and candidate details
  const election = await Election.findByPk(vote.electionId);
  const candidate = await Candidate.findByPk(vote.candidateId);

  if (!election || !candidate) {
    throw new Error('Election or candidate not found');
  }

  // Mark vote as verified
  await vote.update({
    isVerified: true,
  });

  return {
    isVerified: true,
    electionName: election.electionName,
    candidateName: candidate.fullName,
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
export const createUssdSession = async (userId: string, phoneNumber: string): Promise<string> => {
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

  return sessionCode;
};

/**
 * Verify a USSD session
 */
export const verifyUssdSession = async (sessionCode: string, phoneNumber: string) => {
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
export const processUssdRequest = async (
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
