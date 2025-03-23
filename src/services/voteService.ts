import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';
import Vote, { VoteSource } from '../db/models/Vote';
import Voter from '../db/models/Voter';
import Election from '../db/models/Election';
import Candidate from '../db/models/Candidate';
import PollingUnit from '../db/models/PollingUnit';
import { encryptWithAES, generateAESKey, hashData } from './encryptionService';

// Define interfaces for models with their properties
interface CandidateWithProps extends Candidate {
  fullName: string;
  partyAffiliation: string;
}

interface PollingUnitWithProps extends PollingUnit {
  name: string;
  code: string;
}

// Define an interface for Vote with its associations
interface VoteWithAssociations extends Omit<Vote, 'get'> {
  election?: Election;
  candidate?: CandidateWithProps;
  polling_unit?: PollingUnitWithProps;
}

// Define an interface for Vote with count result
interface VoteCountResult extends VoteWithAssociations {
  get(key: string): any;
}

/**
 * Cast a vote in an election
 */
export const castVote = async (
  voterId: string,
  electionId: string,
  candidateId: string,
  pollingUnitId: string,
  voteData: any,
  voteSource: VoteSource = VoteSource.WEB,
) => {
  // Validate voter exists
  const voter = await Voter.findByPk(voterId);
  if (!voter) {
    throw new Error('Voter not found');
  }

  // Validate election exists and is active
  const election = await Election.findOne({
    where: {
      id: electionId,
      isActive: true,
      status: 'ACTIVE',
      startDate: { [Op.lte]: new Date() },
      endDate: { [Op.gte]: new Date() },
    },
  });
  if (!election) {
    throw new Error('Election not found or not active');
  }

  // Validate candidate exists and belongs to the election
  const candidate = await Candidate.findOne({
    where: {
      id: candidateId,
      electionId,
    },
  });
  if (!candidate) {
    throw new Error('Candidate not found or not part of this election');
  }

  // Validate polling unit exists
  const pollingUnit = await PollingUnit.findByPk(pollingUnitId);
  if (!pollingUnit) {
    throw new Error('Polling unit not found');
  }

  // Check if voter has already voted in this election
  const existingVote = await Vote.findOne({
    where: {
      userId: voterId,
      electionId,
    },
  });
  if (existingVote) {
    throw new Error('Voter has already cast a vote in this election');
  }

  // Prepare vote data for encryption
  const voteDataString = JSON.stringify({
    voterId,
    electionId,
    candidateId,
    timestamp: new Date(),
    voteSource,
  });

  // Generate a unique AES key for this vote
  const aesKey = generateAESKey();

  // Encrypt the vote data
  const { encryptedData, iv } = encryptWithAES(voteDataString, aesKey);

  // Create a hash of the vote for verification
  const voteHash = hashData(`${voterId}-${electionId}-${candidateId}-${Date.now()}`);

  // Generate a receipt code from the hash
  const receiptCode = voteHash.substring(0, 16).toUpperCase();

  // Create the vote record
  const vote = await Vote.create({
    id: uuidv4(),
    userId: voterId,
    electionId,
    candidateId,
    pollingUnitId,
    encryptedVoteData: Buffer.from(encryptedData, 'base64'),
    voteHash,
    voteTimestamp: new Date(),
    voteSource,
    isCounted: false,
  });

  return {
    id: vote.id,
    voteHash,
    receiptCode,
    timestamp: vote.voteTimestamp,
  };
};

/**
 * Verify a vote using receipt code
 */
export const verifyVote = async (receiptCode: string) => {
  // Find vote with a hash that starts with the receipt code
  const vote = (await Vote.findOne({
    where: {
      voteHash: { [Op.like]: `${receiptCode}%` },
    },
    include: [
      {
        model: Election,
        as: 'election',
        attributes: ['id', 'electionName', 'electionType'],
      },
      {
        model: Candidate,
        as: 'candidate',
        attributes: ['id', 'fullName', 'partyAffiliation'],
      },
      {
        model: PollingUnit,
        as: 'polling_unit',
        attributes: ['id', 'name', 'code'],
      },
    ],
  })) as unknown as VoteWithAssociations;

  if (!vote) {
    return {
      isValid: false,
      message: 'Vote not found with the provided receipt code',
    };
  }

  return {
    isValid: true,
    timestamp: vote.voteTimestamp,
    electionName: vote.election?.electionName,
    candidateName: vote.candidate?.fullName,
    candidateParty: vote.candidate?.partyAffiliation,
    pollingUnit: vote.polling_unit?.name,
    voteSource: vote.voteSource,
  };
};

/**
 * Get vote history for a voter
 */
export const getVoteHistory = async (voterId: string) => {
  // Find all votes for this voter
  const votes = (await Vote.findAll({
    where: {
      userId: voterId,
    },
    include: [
      {
        model: Election,
        as: 'election',
        attributes: ['id', 'electionName', 'electionType', 'startDate', 'endDate'],
      },
      {
        model: Candidate,
        as: 'candidate',
        attributes: ['id', 'fullName', 'partyAffiliation'],
      },
      {
        model: PollingUnit,
        as: 'polling_unit',
        attributes: ['id', 'name', 'code'],
      },
    ],
    order: [['voteTimestamp', 'DESC']],
  })) as unknown as VoteWithAssociations[];

  return votes.map(vote => ({
    id: vote.id,
    electionId: vote.electionId,
    electionName: vote.election?.electionName,
    electionType: vote.election?.electionType,
    candidateName: vote.candidate?.fullName,
    candidateParty: vote.candidate?.partyAffiliation,
    pollingUnit: vote.polling_unit?.name,
    timestamp: vote.voteTimestamp,
    receiptCode: vote.voteHash.substring(0, 16).toUpperCase(),
    voteSource: vote.voteSource,
  }));
};

/**
 * Count votes for an election
 */
export const countVotes = async (electionId: string) => {
  // Mark votes as counted
  await Vote.update(
    { isCounted: true },
    {
      where: {
        electionId,
        isCounted: false,
      },
    },
  );

  // Get total votes by candidate
  const voteCounts = (await Vote.findAll({
    where: { electionId },
    attributes: [
      'candidateId',
      [(Vote.sequelize as any).fn('COUNT', (Vote.sequelize as any).col('id')), 'voteCount'],
    ],
    include: [
      {
        model: Candidate,
        as: 'candidate',
        attributes: ['id', 'fullName', 'partyAffiliation'],
      },
    ],
    group: ['candidateId', 'candidate.id', 'candidate.fullName', 'candidate.partyAffiliation'],
    order: [[(Vote.sequelize as any).literal('voteCount'), 'DESC']],
  })) as unknown as VoteCountResult[];

  return voteCounts.map(count => ({
    candidateId: count.candidateId,
    candidateName: count.candidate?.fullName,
    candidateParty: count.candidate?.partyAffiliation,
    voteCount: parseInt(count.get('voteCount') as string, 10),
  }));
};
