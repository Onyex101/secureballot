import Election, { ElectionStatus } from '../db/models/Election';
import Candidate from '../db/models/Candidate';
import Voter from '../db/models/Voter';
import PollingUnit from '../db/models/PollingUnit';
import Vote, { VoteSource } from '../db/models/Vote';
import { v4 as uuidv4 } from 'uuid';
import { Op, WhereOptions } from 'sequelize';
import crypto from 'crypto';
import { decrypt } from 'eciesjs';
import { ApiError } from '../middleware/errorHandler';
import db from '../db/models';
import { logError } from '../utils/logger';
import { checkVoterEligibility } from './voterService';

// --- IMPORTANT: Load the server's private key securely ---
// This should come from a secure source like environment variables or a secret manager
// NEVER hardcode private keys!
// Example: Using environment variable
const serverPrivateKeyPem = process.env.SERVER_ECC_PRIVATE_KEY_PEM;
const VOTE_DATA_ENCODING = 'utf-8';

interface DecryptedVoteData {
  // Define the structure of the actual decrypted vote
  // e.g., { candidateId: string, timestamp: number, validityToken?: string }
  candidateId: string;
  timestamp: number; // Example: Unix timestamp from client
  // Add any other fields expected within the decrypted vote payload
}

/**
 * Check if there are overlapping elections of the same type
 */
export const checkOverlappingElections = async (
  electionType: string,
  startDate: string,
  endDate: string,
) => {
  const overlappingElection = await Election.findOne({
    where: {
      electionType,
      [Op.or]: [
        {
          startDate: {
            [Op.between]: [new Date(startDate), new Date(endDate)],
          },
        },
        {
          endDate: {
            [Op.between]: [new Date(startDate), new Date(endDate)],
          },
        },
      ],
    },
  });

  return overlappingElection !== null;
};

/**
 * Create a new election
 */
export const createElection = async (
  electionName: string,
  electionType: string,
  startDate: string,
  endDate: string,
  createdBy: string,
  description?: string,
  eligibilityRules?: any,
) => {
  // Create new election
  const newElection = await Election.create({
    // id: uuidv4(), // Let default handle it
    electionName,
    electionType,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    description: description || null,
    // isActive: false, // Default handled by model
    // status: ElectionStatus.DRAFT, // Default handled by model
    eligibilityRules: eligibilityRules || null,
    createdBy,
  });

  return newElection;
};

/**
 * Get election by ID
 */
export const getElectionById = (electionId: string) => {
  return Election.findByPk(electionId);
};

/**
 * Get elections by status
 */
export const getElections = (statusFilter: string) => {
  const statuses = statusFilter.split(',');

  return Election.findAll({
    where: {
      status: {
        [Op.in]: statuses,
      },
    },
    order: [['startDate', 'ASC']],
  });
};

/**
 * Get candidates for an election
 */
export const getElectionCandidates = async (
  electionId: string,
  page: number = 1,
  limit: number = 50,
  search?: string,
) => {
  const election = await Election.findByPk(electionId);
  if (!election) {
    throw new ApiError(404, 'Election not found');
  }

  const offset = (page - 1) * limit;
  const whereClause: WhereOptions = { electionId };

  if (search) {
    (whereClause as any)[Op.or] = [
      { fullName: { [Op.iLike]: `%${search}%` } },
      { partyName: { [Op.iLike]: `%${search}%` } },
      { partyCode: { [Op.iLike]: `%${search}%` } },
    ];
  }

  const { count, rows: candidates } = await Candidate.findAndCountAll({
    where: whereClause,
    limit,
    offset,
    order: [['fullName', 'ASC']],
  });

  const totalPages = Math.ceil(count / limit);

  return {
    election: {
      id: election.id,
      name: election.electionName,
      type: election.electionType,
      status: election.status,
    },
    candidates,
    pagination: {
      total: count,
      page,
      limit,
      totalPages,
    },
  };
};

/**
 * Get voter details including polling unit
 */
export const getVoterDetails = async (userId: string) => {
  const voter = await Voter.findByPk(userId, {
    include: [
      {
        model: db.PollingUnit,
        as: 'pollingUnit',
        required: false,
        attributes: ['id', 'pollingUnitName', 'pollingUnitCode'],
      },
    ],
  });

  if (!voter) {
    throw new ApiError(404, 'Voter not found');
  }

  const pollingUnit = voter.get('pollingUnit') as PollingUnit | undefined;

  return {
    id: voter.id,
    nin: voter.nin,
    vin: voter.vin,
    phoneNumber: voter.phoneNumber,
    pollingUnit: pollingUnit
      ? {
          id: pollingUnit.id,
          name: pollingUnit.pollingUnitName,
          code: pollingUnit.pollingUnitCode,
        }
      : null,
  };
};

/**
 * Get polling units by state/lga/ward
 */
export const getPollingUnits = async (
  filters: { state?: string; lga?: string; ward?: string },
  page: number = 1,
  limit: number = 50,
  search?: string,
) => {
  const whereClause: WhereOptions = {};
  if (filters.state) whereClause.state = filters.state;
  if (filters.lga) whereClause.lga = filters.lga;
  if (filters.ward) whereClause.ward = filters.ward;

  if (search) {
    (whereClause as any)[Op.or] = [
      { pollingUnitName: { [Op.iLike]: `%${search}%` } },
      { pollingUnitCode: { [Op.iLike]: `%${search}%` } },
      { address: { [Op.iLike]: `%${search}%` } },
    ];
  }

  const offset = (page - 1) * limit;
  const { count, rows: pollingUnits } = await PollingUnit.findAndCountAll({
    where: whereClause,
    limit,
    offset,
    order: [['pollingUnitName', 'ASC']],
  });

  const totalPages = Math.ceil(count / limit);

  return {
    pollingUnits,
    pagination: {
      total: count,
      page,
      limit,
      totalPages,
    },
  };
};

/**
 * Decrypts vote data using the server's private key.
 *
 * @param encryptedDataHex - The encrypted data as a hex string.
 * @returns The decrypted vote data object.
 * @throws ApiError if decryption fails or private key is missing.
 */
const decryptVoteData = (encryptedDataHex: string): DecryptedVoteData => {
  if (!serverPrivateKeyPem) {
    logError('SERVER_ECC_PRIVATE_KEY_PEM is not set');
    throw new ApiError(500, 'Server configuration error: Missing private key.');
  }

  try {
    const encryptedDataBuffer = Buffer.from(encryptedDataHex, 'hex');
    // Note: ECIES decryption needs the private key in Buffer format
    const serverPrivateKeyBuffer = Buffer.from(serverPrivateKeyPem);
    const decryptedDataBuffer = decrypt(serverPrivateKeyBuffer, encryptedDataBuffer);
    const decryptedJson = decryptedDataBuffer.toString(VOTE_DATA_ENCODING);
    const decryptedData: DecryptedVoteData = JSON.parse(decryptedJson);

    // Basic validation of decrypted data structure
    if (!decryptedData || typeof decryptedData.candidateId !== 'string') {
      throw new Error('Invalid decrypted vote structure.');
    }

    return decryptedData;
  } catch (error: any) {
    logError('Decryption failed', error);
    throw new ApiError(400, `Vote decryption failed: ${error.message}`);
  }
};

/**
 * Cast a vote for an election.
 */
export const castVote = async (
  userId: string,
  electionId: string,
  encryptedVoteDataHex: string,
  voteSource: VoteSource,
  clientPublicKey?: string,
): Promise<Vote> => {
  const voter = await Voter.findByPk(userId);

  if (!voter) {
    throw new ApiError(404, 'Voter not found.');
  }

  if (!voter.pollingUnitCode) {
    throw new ApiError(400, 'Voter registration incomplete (missing polling unit code).');
  }

  const isEligible = await checkVoterEligibility(userId, electionId);
  if (!isEligible) {
    throw new ApiError(403, 'Voter is not eligible for this election.');
  }

  const existingVote = await Vote.findOne({
    where: {
      userId,
      electionId,
    },
  });

  if (existingVote) {
    throw new ApiError(409, 'Voter has already cast a vote in this election.');
  }

  const decryptedData = decryptVoteData(encryptedVoteDataHex);
  const { candidateId } = decryptedData;
  const candidate = await Candidate.findOne({
    where: {
      id: candidateId,
      electionId: electionId,
      status: 'approved',
      isActive: true,
    },
  });
  if (!candidate) {
    throw new ApiError(400, 'Invalid or ineligible candidate ID.');
  }

  const pollingUnit = await PollingUnit.findOne({
    where: { pollingUnitCode: voter.pollingUnitCode },
    attributes: ['id'],
  });

  if (!pollingUnit) {
    throw new ApiError(500, 'Could not find polling unit associated with voter.');
  }
  const pollingUnitId = pollingUnit.id;

  const voteDataToHash = `${userId}-${electionId}-${candidateId}-${Date.now()}`;
  const voteHash = crypto.createHash('sha256').update(voteDataToHash).digest('hex');
  const receiptCode = uuidv4();

  // Generate required encryption fields for hybrid encryption
  const aesKey = crypto.randomBytes(32); // 256-bit AES key
  const iv = crypto.randomBytes(16); // 128-bit IV
  const publicKeyFingerprint = crypto
    .createHash('sha256')
    .update(clientPublicKey || 'default-key')
    .digest('hex')
    .substring(0, 16);

  // For now, store the AES key as-is (in production, this should be encrypted with public key)
  const encryptedAesKey = aesKey.toString('hex');

  const vote = await db.sequelize.transaction(async t => {
    const newVote = await Vote.create(
      {
        userId,
        electionId,
        candidateId,
        pollingUnitId,
        encryptedVoteData: Buffer.from(encryptedVoteDataHex, 'hex'),
        encryptedAesKey,
        iv: iv.toString('hex'),
        voteHash,
        publicKeyFingerprint,
        voteSource,
        receiptCode,
      },
      { transaction: t },
    );

    if (clientPublicKey && !voter.publicKey) {
      await voter.update({ publicKey: clientPublicKey }, { transaction: t });
    }

    return newVote;
  });

  return vote;
};

/**
 * Process a batch of offline votes.
 */
export const processOfflineVoteBatch = async (
  offlineVotes: { userId: string; encryptedVote: string }[],
  electionId: string,
): Promise<{ successful: number; failed: number; errors: string[] }> => {
  let successful = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const voteData of offlineVotes) {
    try {
      await castVote(voteData.userId, electionId, voteData.encryptedVote, VoteSource.OFFLINE);
      successful++;
    } catch (error: any) {
      failed++;
      errors.push(`Vote for user ${voteData.userId} failed: ${error.message}`);
      logError(`Offline vote processing failed for user ${voteData.userId}`, error);
    }
  }

  return { successful, failed, errors };
};

/**
 * Update the status of an election.
 */
export const updateElectionStatus = async (
  electionId: string,
  newStatus: ElectionStatus,
): Promise<Election> => {
  const election = await Election.findByPk(electionId);
  if (!election) {
    throw new ApiError(404, 'Election not found');
  }

  if (election.status === ElectionStatus.COMPLETED && newStatus !== ElectionStatus.COMPLETED) {
    // Allow changing from completed only under specific circumstances?
    // throw new ApiError(400, 'Cannot change status of a completed election.');
  }
  if (election.status === ElectionStatus.CANCELLED && newStatus !== ElectionStatus.CANCELLED) {
    throw new ApiError(400, 'Cannot change status of a cancelled election.');
  }

  await election.update({ status: newStatus });

  // Potentially trigger side effects based on status change (e.g., notifications)

  return election;
};

/**
 * Mark election results as published or preliminary published.
 */
export const publishElectionResults = async (
  electionId: string,
  type: 'preliminary' | 'final',
): Promise<Election> => {
  const election = await Election.findByPk(electionId);
  if (!election) {
    throw new ApiError(404, 'Election not found');
  }

  if (election.status !== ElectionStatus.COMPLETED) {
    throw new ApiError(400, 'Election must be completed to publish results.');
  }

  const updateData: Partial<any> = {};
  const now = new Date();

  if (type === 'preliminary') {
    updateData.preliminaryResultsPublished = true;
    updateData.preliminaryResultsPublishedAt = now;
  } else if (type === 'final') {
    updateData.resultsPublished = true;
    updateData.resultsPublishedAt = now;
    // Optionally mark preliminary as published too if final is published
    if (!election.preliminaryResultsPublished) {
      updateData.preliminaryResultsPublished = true;
      updateData.preliminaryResultsPublishedAt = now;
    }
  }

  await election.update(updateData);

  return election;
};

/**
 * Get active elections
 */
export const getActiveElections = (): Promise<Election[]> => {
  const now = new Date();
  return Election.findAll({
    where: {
      status: ElectionStatus.ACTIVE,
      startDate: { [Op.lte]: now },
      endDate: { [Op.gte]: now },
    },
    order: [['startDate', 'ASC']],
  });
};

/**
 * Get upcoming elections
 */
export const getUpcomingElections = (): Promise<Election[]> => {
  const now = new Date();
  return Election.findAll({
    where: {
      status: ElectionStatus.SCHEDULED,
      startDate: { [Op.gt]: now },
    },
    order: [['startDate', 'ASC']],
  });
};
