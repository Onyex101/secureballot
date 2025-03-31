import { Op, Sequelize } from 'sequelize';
import Vote, { VoteSource } from '../db/models/Vote';
import Voter from '../db/models/Voter';
import Election, { ElectionStatus } from '../db/models/Election';
import Candidate from '../db/models/Candidate';
import PollingUnit from '../db/models/PollingUnit';
import { hashData } from './encryptionService';
import { ApiError } from '../middleware/errorHandler';

/**
 * Cast a vote in an election
 */
export const castVote = async (
  voterId: string,
  electionId: string,
  candidateId: string,
  pollingUnitId: string,
  voteSource: VoteSource = VoteSource.WEB,
) => {
  // Validate voter exists
  const voter = await Voter.findByPk(voterId);
  if (!voter) {
    throw new ApiError(404, 'Voter not found');
  }

  // Validate election exists and is active
  const election = await Election.findOne({
    where: {
      id: electionId,
      isActive: true,
      status: ElectionStatus.ACTIVE,
      startDate: { [Op.lte]: new Date() },
      endDate: { [Op.gte]: new Date() },
    },
  });
  if (!election) {
    throw new ApiError(404, 'Election not found or not active');
  }

  // Validate candidate exists and belongs to the election
  const candidate = await Candidate.findOne({
    where: {
      id: candidateId,
      electionId,
      isActive: true,
    },
  });
  if (!candidate) {
    throw new ApiError(400, 'Candidate not found or not active for this election');
  }

  // Validate polling unit exists
  const pollingUnit = await PollingUnit.findByPk(pollingUnitId);
  if (!pollingUnit) {
    throw new ApiError(404, 'Polling unit not found');
  }

  // Check if voter has already voted in this election
  const existingVote = await Vote.findOne({
    where: {
      userId: voterId,
      electionId,
    },
  });
  if (existingVote) {
    throw new ApiError(409, 'Voter has already cast a vote in this election');
  }

  // Create a hash of the vote for verification
  const voteDataToHash = `${voterId}-${electionId}-${candidateId}-${pollingUnitId}-${Date.now()}`;
  const voteHash = hashData(voteDataToHash);

  // Generate a receipt code from the hash
  const receiptCode = voteHash.substring(0, 16).toUpperCase();

  // Create the vote record
  const vote = await Vote.create({
    userId: voterId,
    electionId,
    candidateId,
    pollingUnitId,
    encryptedVoteData: Buffer.from('placeholder-encrypted-data'),
    voteHash,
    receiptCode,
    voteSource,
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
  const vote = await Vote.findOne({
    where: {
      receiptCode: receiptCode.toUpperCase(),
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
        attributes: ['id', 'fullName', 'partyName', 'partyCode'],
      },
      {
        model: PollingUnit,
        as: 'polling_unit',
        attributes: ['id', 'pollingUnitName', 'pollingUnitCode'],
      },
    ],
  });

  const voteWithAssoc = vote as Vote & {
    election?: Election;
    candidate?: Candidate;
    polling_unit?: PollingUnit;
  };

  if (!voteWithAssoc) {
    return {
      isValid: false,
      message: 'Vote not found with the provided receipt code',
    };
  }

  return {
    isValid: true,
    timestamp: voteWithAssoc.voteTimestamp,
    electionName: voteWithAssoc.election?.electionName,
    candidateName: voteWithAssoc.candidate?.fullName,
    candidateParty: voteWithAssoc.candidate?.partyName,
    pollingUnit: voteWithAssoc.polling_unit?.pollingUnitName,
    voteSource: voteWithAssoc.voteSource,
  };
};

/**
 * Get vote history for a voter
 */
export const getVoteHistory = async (voterId: string) => {
  const votes = await Vote.findAll({
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
        attributes: ['id', 'fullName', 'partyName', 'partyCode'],
      },
      {
        model: PollingUnit,
        as: 'polling_unit',
        attributes: ['id', 'pollingUnitName', 'pollingUnitCode'],
      },
    ],
    order: [['voteTimestamp', 'DESC']],
  });

  return votes.map(vote => {
    const voteWithAssoc = vote as Vote & {
      election?: Election;
      candidate?: Candidate;
      polling_unit?: PollingUnit;
    };
    return {
      id: voteWithAssoc.id,
      electionId: voteWithAssoc.electionId,
      electionName: voteWithAssoc.election?.electionName,
      electionType: voteWithAssoc.election?.electionType,
      candidateName: voteWithAssoc.candidate?.fullName,
      candidateParty: voteWithAssoc.candidate?.partyName,
      pollingUnit: voteWithAssoc.polling_unit?.pollingUnitName,
      timestamp: voteWithAssoc.voteTimestamp,
      receiptCode: voteWithAssoc.receiptCode,
      voteSource: voteWithAssoc.voteSource,
    };
  });
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
  const voteCounts = await Vote.findAll({
    where: { electionId },
    attributes: [
      'candidateId',
      [
        (Vote.sequelize as Sequelize).fn('COUNT', (Vote.sequelize as Sequelize).col('id')),
        'voteCount',
      ],
    ],
    include: [
      {
        model: Candidate,
        as: 'candidate',
        attributes: ['id', 'fullName', 'partyName', 'partyCode'],
        required: true,
      },
    ],
    group: ['candidateId', 'candidate.id'],
    raw: true,
  });

  return voteCounts.map((result: any) => ({
    candidateId: result.candidateId,
    candidateName: result['candidate.fullName'],
    partyName: result['candidate.partyName'],
    partyCode: result['candidate.partyCode'],
    voteCount: parseInt(result.voteCount, 10),
  }));
};
