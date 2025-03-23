import Election, { ElectionStatus } from '../db/models/Election';
import Candidate from '../db/models/Candidate';
import Voter from '../db/models/Voter';
import PollingUnit from '../db/models/PollingUnit';
import Vote from '../db/models/Vote';
import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';

// Define extended interfaces with needed properties
interface VoterWithAssociations extends Voter {
  polling_unit?: PollingUnitWithProperties;
}

interface PollingUnitWithProperties extends PollingUnit {
  id: string;
  name: string;
  code: string;
}

interface ElectionWithPublishProperties extends Election {
  resultsPublished?: boolean;
  resultsPublishedAt?: Date;
  preliminaryResultsPublished?: boolean;
  preliminaryResultsPublishedAt?: Date;
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
    id: uuidv4(),
    electionName,
    electionType,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    description: description || null,
    isActive: false,
    status: ElectionStatus.DRAFT,
    eligibilityRules: eligibilityRules || null,
    createdBy,
  });

  return newElection;
};

/**
 * Get election by ID
 */
export const getElectionById = async (electionId: string) => {
  return await Election.findByPk(electionId);
};

/**
 * Get elections by status
 */
export const getElections = async (statusFilter: string) => {
  const statuses = statusFilter.split(',');

  return await Election.findAll({
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
  // Validate the election exists
  const election = await Election.findByPk(electionId);
  if (!election) {
    throw new Error('Election not found');
  }

  // Calculate offset for pagination
  const offset = (page - 1) * limit;

  // Build query conditions
  const whereClause: any = { electionId };

  if (search) {
    whereClause[Op.or] = [
      { fullName: { [Op.iLike]: `%${search}%` } },
      { partyAffiliation: { [Op.iLike]: `%${search}%` } },
    ];
  }

  // Fetch candidates with pagination
  const { count, rows: candidates } = await Candidate.findAndCountAll({
    where: whereClause,
    limit,
    offset,
    order: [['fullName', 'ASC']],
  });

  // Calculate total pages
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
 * Get voter details
 */
export const getVoterDetails = async (userId: string) => {
  const voter = (await Voter.findByPk(userId, {
    include: [
      {
        model: PollingUnit,
        as: 'polling_unit',
        attributes: ['id', 'name', 'code'],
      },
    ],
  })) as unknown as VoterWithAssociations;

  if (!voter) {
    throw new Error('Voter not found');
  }

  return {
    id: voter.id,
    nin: voter.nin,
    vin: voter.vin,
    phoneNumber: voter.phoneNumber,
    pollingUnit: voter.polling_unit
      ? {
          id: voter.polling_unit.id,
          name: voter.polling_unit.name,
          code: voter.polling_unit.code,
        }
      : null,
  };
};

/**
 * Get polling units by region
 */
export const getPollingUnitsByRegion = async (
  regionId: string,
  page: number = 1,
  limit: number = 50,
  search?: string,
) => {
  // Build query conditions
  const whereClause: any = { regionId };

  if (search) {
    whereClause[Op.or] = [
      { name: { [Op.iLike]: `%${search}%` } },
      { code: { [Op.iLike]: `%${search}%` } },
      { address: { [Op.iLike]: `%${search}%` } },
    ];
  }

  // Calculate offset for pagination
  const offset = (page - 1) * limit;

  // Fetch polling units with pagination
  const { count, rows: pollingUnits } = await PollingUnit.findAndCountAll({
    where: whereClause,
    limit,
    offset,
    order: [['name', 'ASC']],
  });

  // Calculate total pages
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
 * Check voter eligibility for an election
 */
export const checkVoterEligibility = async (userId: string, electionId: string) => {
  // Get the voter
  const voter = await Voter.findByPk(userId);
  if (!voter) {
    return {
      isEligible: false,
      reason: 'Voter not found',
    };
  }

  // Get the election
  const election = await Election.findByPk(electionId);
  if (!election) {
    return {
      isEligible: false,
      reason: 'Election not found',
    };
  }

  // Check if the election is active
  if (election.status !== ElectionStatus.ACTIVE) {
    return {
      isEligible: false,
      reason: `Election is ${election.status.toLowerCase()}, not active`,
    };
  }

  // Check if voter has already voted in this election
  const existingVote = await Vote.findOne({
    where: {
      userId,
      electionId,
    },
  });

  if (existingVote) {
    return {
      isEligible: false,
      reason: 'Voter has already cast a vote in this election',
    };
  }

  // Check election-specific eligibility rules if they exist
  if (election.eligibilityRules) {
    // Apply eligibility rules based on the rules object
    // This would be a more complex implementation based on specific requirements
    // For example, checking age, region, voter category, etc.

    // For now, assuming all voters are eligible if they haven't voted yet
    return {
      isEligible: true,
      reason: null,
    };
  }

  // Default to eligible if no specific rules
  return {
    isEligible: true,
    reason: null,
  };
};

/**
 * Cast a vote
 */
export const castVote = async (
  userId: string,
  electionId: string,
  candidateId: string,
  encryptedVote: string,
) => {
  // This would typically create a Vote record
  // For now, returning mock data
  return {
    id: uuidv4(),
    receiptCode: `VOTE${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
    timestamp: new Date(),
  };
};

/**
 * Update election status
 */
export const updateElectionStatus = async (electionId: string, status: ElectionStatus) => {
  const election = await Election.findByPk(electionId);

  if (!election) {
    return null;
  }

  await election.update({ status });
  return election;
};

/**
 * Publish election results
 */
export const publishElectionResults = async (
  electionId: string,
  publishLevel: 'preliminary' | 'final',
) => {
  const election = (await Election.findByPk(
    electionId,
  )) as unknown as ElectionWithPublishProperties;

  if (!election) {
    return null;
  }

  // For final results, update the election status
  if (publishLevel === 'final') {
    await election.update({
      status: ElectionStatus.COMPLETED,
      resultsPublished: true,
      resultsPublishedAt: new Date(),
    } as any);
  } else {
    // For preliminary results
    await election.update({
      preliminaryResultsPublished: true,
      preliminaryResultsPublishedAt: new Date(),
    } as any);
  }

  return {
    electionId: election.id,
    electionName: election.electionName,
    publishLevel,
    publishedAt:
      publishLevel === 'final'
        ? election.resultsPublishedAt
        : election.preliminaryResultsPublishedAt,
  };
};
