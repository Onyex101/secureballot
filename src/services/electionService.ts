import Election, { ElectionStatus } from '../db/models/Election';
import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';

/**
 * Check if there are overlapping elections of the same type
 */
export const checkOverlappingElections = async (
  electionType: string,
  startDate: string,
  endDate: string
) => {
  const overlappingElection = await Election.findOne({
    where: {
      electionType,
      [Op.or]: [
        {
          startDate: {
            [Op.between]: [new Date(startDate), new Date(endDate)]
          }
        },
        {
          endDate: {
            [Op.between]: [new Date(startDate), new Date(endDate)]
          }
        }
      ]
    }
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
  eligibilityRules?: any
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
    createdBy
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
        [Op.in]: statuses
      }
    },
    order: [['startDate', 'ASC']]
  });
};

/**
 * Get candidates for an election
 */
export const getElectionCandidates = async (electionId: string) => {
  // This would typically join with a Candidate model
  // For now, returning mock data
  return [
    {
      id: uuidv4(),
      fullName: 'John Doe',
      partyAffiliation: 'Party A',
      position: 'President',
      photoUrl: 'https://example.com/photos/candidate1.jpg',
      electionId
    },
    {
      id: uuidv4(),
      fullName: 'Jane Smith',
      partyAffiliation: 'Party B',
      position: 'President',
      photoUrl: 'https://example.com/photos/candidate2.jpg',
      electionId
    }
  ];
};

/**
 * Get voter details
 */
export const getVoterDetails = async (userId: string) => {
  // This would typically fetch from a Voter model
  // For now, returning mock data
  return {
    id: userId,
    nin: '12345678901',
    vin: '1234567890123456789',
    phoneNumber: '+2348012345678',
    pollingUnit: {
      id: 'pu-123',
      name: 'Ward 1 Polling Unit 5',
      code: 'PU12345'
    }
  };
};

/**
 * Get polling units by region
 */
export const getPollingUnitsByRegion = async (regionId: string) => {
  // This would typically fetch from a PollingUnit model
  // For now, returning mock data
  return [
    {
      id: 'pu-123',
      name: 'Ward 1 Polling Unit 5',
      code: 'PU12345',
      address: '123 Main Street, Lagos',
      regionId
    },
    {
      id: 'pu-124',
      name: 'Ward 1 Polling Unit 6',
      code: 'PU12346',
      address: '124 Main Street, Lagos',
      regionId
    }
  ];
};

/**
 * Check voter eligibility for an election
 */
export const checkVoterEligibility = async (userId: string, electionId: string) => {
  // This would typically check against eligibility rules
  // For now, returning mock data
  return {
    isEligible: true,
    reason: null
  };
};

/**
 * Cast a vote
 */
export const castVote = async (userId: string, electionId: string, candidateId: string, encryptedVote: string) => {
  // This would typically create a Vote record
  // For now, returning mock data
  return {
    id: uuidv4(),
    receiptCode: `VOTE${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
    timestamp: new Date()
  };
};

/**
 * Update election status
 */
export const updateElectionStatus = async (
  electionId: string,
  status: ElectionStatus
) => {
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
  publishLevel: 'preliminary' | 'final'
) => {
  const election = await Election.findByPk(electionId);
  
  if (!election) {
    return null;
  }
  
  // For final results, update the election status
  if (publishLevel === 'final') {
    await election.update({
      status: ElectionStatus.COMPLETED
    });
  }
  
  return {
    electionId: election.id,
    electionName: election.electionName,
    publishLevel,
    publishedAt: new Date()
  };
};
