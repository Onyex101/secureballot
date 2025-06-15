import Election, { ElectionStatus } from '../db/models/Election';
import Candidate from '../db/models/Candidate';
import Voter from '../db/models/Voter';
import PollingUnit from '../db/models/PollingUnit';
import Vote, { VoteSource } from '../db/models/Vote';
import { v4 as uuidv4 } from 'uuid';
import { Op, WhereOptions, QueryTypes } from 'sequelize';
import crypto from 'crypto';
import { decrypt } from 'eciesjs';
import { ApiError } from '../middleware/errorHandler';
import db from '../db/models';
import { logError } from '../utils/logger';
import { checkVoterEligibility } from './voterService';
import { getGeopoliticalZone, NIGERIA_GEOPOLITICAL_ZONES } from '../utils/geopoliticalZones';

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

interface GetElectionsOptions {
  status?: string;
  type?: string;
  page?: number;
  limit?: number;
  search?: string;
}

interface ElectionsPaginationResult {
  elections: Election[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
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
    isActive: true,
    status: ElectionStatus.ACTIVE,
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
 * Enhanced method to get elections with filtering, pagination, and search
 */
export const getElectionsWithPagination = async (
  options: GetElectionsOptions,
): Promise<ElectionsPaginationResult> => {
  const { status = 'active', type, page = 1, limit = 10, search } = options;
  const offset = (Number(page) - 1) * Number(limit);
  const whereClause: any = {};

  // Status filtering
  if (status === 'active') {
    whereClause.status = ElectionStatus.ACTIVE;
  } else if (status === 'upcoming') {
    whereClause.startDate = { [Op.gt]: new Date() };
    whereClause.status = ElectionStatus.SCHEDULED;
  } else if (status === 'past') {
    whereClause.endDate = { [Op.lt]: new Date() };
    whereClause.status = { [Op.in]: [ElectionStatus.COMPLETED, ElectionStatus.CANCELLED] };
  } else if (status) {
    whereClause.status = status; // Allow filtering by specific status like DRAFT
  }

  // Type filtering
  if (type) {
    whereClause.electionType = type;
  }

  // Search filtering
  if (search) {
    whereClause[Op.or] = [
      { electionName: { [Op.iLike]: `%${search}%` } },
      { description: { [Op.iLike]: `%${search}%` } },
      { electionType: { [Op.iLike]: `%${search}%` } },
    ];
  }

  const { count, rows: elections } = await Election.findAndCountAll({
    where: whereClause,
    attributes: [
      'id',
      'electionName',
      'electionType',
      'startDate',
      'endDate',
      'description',
      'status',
    ],
    order: [['startDate', 'ASC']],
    limit: Number(limit),
    offset,
  });

  return {
    elections,
    pagination: {
      total: count,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(count / Number(limit)),
    },
  };
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
    nin: voter.decryptedNin,
    vin: voter.decryptedVin,
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

/**
 * Get vote statistics by geopolitical zones for an election
 */
export const getVotesByGeopoliticalZones = async (electionId: string) => {
  // Get votes by states first
  const votesByState = (await db.sequelize.query(
    `
    SELECT 
      pu.state as state_name,
      COUNT(v.id) as vote_count
    FROM votes v
    JOIN polling_units pu ON v.polling_unit_id = pu.id
    WHERE v.election_id = :electionId
    GROUP BY pu.state
    ORDER BY vote_count DESC
  `,
    {
      replacements: { electionId },
      type: QueryTypes.SELECT,
    },
  )) as any[];

  // Get total votes for percentage calculation
  const totalVotes = await Vote.count({ where: { electionId } });

  // Group votes by geopolitical zones
  const votesByZone = new Map<string, { vote_count: number; states: string[] }>();

  votesByState.forEach((stateData: any) => {
    const zone = getGeopoliticalZone(stateData.state_name);
    if (zone) {
      if (!votesByZone.has(zone)) {
        votesByZone.set(zone, { vote_count: 0, states: [] });
      }
      const zoneData = votesByZone.get(zone)!;
      zoneData.vote_count += parseInt(stateData.vote_count, 10);
      zoneData.states.push(stateData.state_name);
    }
  });

  // Convert to array format with detailed information
  return Array.from(votesByZone.entries())
    .map(([zoneName, data]) => ({
      region_name: zoneName, // Match dashboard field name
      vote_count: data.vote_count,
      percentage: totalVotes > 0 ? Math.round((data.vote_count / totalVotes) * 100 * 100) / 100 : 0,
      states: data.states, // Match dashboard field name
      zone_info: NIGERIA_GEOPOLITICAL_ZONES[zoneName], // Match dashboard field name
      states_reported: data.states.length,
      total_states_in_zone: NIGERIA_GEOPOLITICAL_ZONES[zoneName]?.states.length || 0,
    }))
    .sort((a, b) => b.vote_count - a.vote_count);
};

/**
 * Get comprehensive election dashboard data
 */
export const getElectionDashboard = async (electionId: string) => {
  // Get the election
  const election = await Election.findByPk(electionId, {
    include: [
      {
        model: db.ElectionStats,
        as: 'stats',
        required: false,
      },
    ],
  });

  if (!election) {
    throw new ApiError(404, 'Election not found');
  }

  // Get all candidates for this election
  const candidates = await Candidate.findAll({
    where: {
      electionId,
      isActive: true,
    },
    attributes: [
      'id',
      'fullName',
      'partyName',
      'partyCode',
      'bio',
      'photoUrl',
      'position',
      'manifesto',
      'status',
    ],
    order: [['fullName', 'ASC']],
  });

  // Get total registered voters (eligible for this election)
  const totalRegisteredVoters = await Voter.count({
    where: {
      isActive: true,
    },
  });

  // Get total votes cast for this election
  const totalVotesCast = await Vote.count({
    where: { electionId },
  });

  // Get valid votes (assuming all votes are valid for now)
  const validVotes = totalVotesCast;
  const invalidVotes = 0; // Placeholder - implement validation logic if needed

  // Get vote counts by candidate
  const candidateVoteCounts = (await Vote.findAll({
    where: { electionId },
    attributes: [
      'candidateId',
      [db.sequelize.fn('COUNT', db.sequelize.col('Vote.id')), 'voteCount'],
    ],
    group: ['candidateId'],
    raw: true,
  })) as any[];

  // Get vote distribution by party
  const votesByParty = candidates.map(candidate => {
    const voteData = candidateVoteCounts.find((vc: any) => vc.candidateId === candidate.id);
    const voteCount = voteData ? parseInt(voteData.voteCount, 10) : 0;
    const percentage = validVotes > 0 ? (voteCount / validVotes) * 100 : 0;

    return {
      candidateId: candidate.id,
      candidateName: candidate.fullName,
      partyName: candidate.partyName,
      partyCode: candidate.partyCode,
      votes: voteCount,
      percentage: Math.round(percentage * 100) / 100,
    };
  });

  // Sort by votes (descending)
  votesByParty.sort((a, b) => b.votes - a.votes);

  // Get polling units that have reported
  const pollingUnitsReported = (await db.sequelize.query(
    `
    SELECT COUNT(DISTINCT v.polling_unit_id) as reported_count
    FROM votes v
    WHERE v.election_id = :electionId
  `,
    {
      replacements: { electionId },
      type: QueryTypes.SELECT,
    },
  )) as any[];

  const totalPollingUnits = await PollingUnit.count();
  const reportedCount = parseInt(String(pollingUnitsReported[0]?.reported_count || 0), 10);
  const reportingPercentage = totalPollingUnits > 0 ? (reportedCount / totalPollingUnits) * 100 : 0;

  // Calculate turnout percentage
  const turnoutPercentage =
    totalRegisteredVoters > 0 ? (totalVotesCast / totalRegisteredVoters) * 100 : 0;

  // Use the dedicated function to get votes by geopolitical zones
  const votesByRegion = await getVotesByGeopoliticalZones(electionId);

  // Get recent vote activity (last 10 votes for live updates simulation)
  const recentActivity = await Vote.findAll({
    where: { electionId },
    include: [
      {
        model: PollingUnit,
        as: 'pollingUnit',
        attributes: ['pollingUnitName', 'state', 'lga'],
      },
      {
        model: Candidate,
        as: 'candidate',
        attributes: ['fullName', 'partyCode'],
      },
    ],
    attributes: ['id', 'voteTimestamp', 'voteSource'],
    order: [['voteTimestamp', 'DESC']],
    limit: 10,
  });

  // Calculate display status
  const now = new Date();
  let displayStatus = election.status;
  if (
    election.status === ElectionStatus.SCHEDULED &&
    now >= election.startDate &&
    now <= election.endDate
  ) {
    displayStatus = ElectionStatus.ACTIVE;
  } else if (election.status === ElectionStatus.ACTIVE && now > election.endDate) {
    displayStatus = ElectionStatus.COMPLETED;
  }

  // Update or create election stats
  const statsData = {
    electionId,
    totalVotes: totalVotesCast,
    validVotes,
    invalidVotes,
    turnoutPercentage: Math.round(turnoutPercentage * 100) / 100,
    lastUpdated: new Date(),
  };

  await db.ElectionStats.upsert(statsData);

  return {
    // Overview data
    overview: {
      election: {
        id: election.id,
        electionName: election.electionName,
        electionType: election.electionType,
        startDate: election.startDate,
        endDate: election.endDate,
        description: election.description,
        status: election.status,
        displayStatus,
      },
      statistics: {
        totalVotesCast,
        validVotes,
        invalidVotes,
        voterTurnout: Math.round(turnoutPercentage * 100) / 100,
        totalRegisteredVoters,
        pollingUnitsReported: `${reportedCount}/${totalPollingUnits}`,
        reportingPercentage: Math.round(reportingPercentage * 100) / 100,
      },
      voteDistribution: votesByParty,
      lastUpdated: new Date(),
    },

    // Candidates data
    candidates: {
      totalCandidates: candidates.length,
      candidatesList: candidates.map(candidate => ({
        id: candidate.id,
        fullName: candidate.fullName,
        partyName: candidate.partyName,
        partyCode: candidate.partyCode,
        bio: candidate.bio,
        photoUrl: candidate.photoUrl,
        position: candidate.position,
        manifesto: candidate.manifesto,
        status: candidate.status,
        votes: votesByParty.find(v => v.candidateId === candidate.id)?.votes || 0,
        percentage: votesByParty.find(v => v.candidateId === candidate.id)?.percentage || 0,
      })),
      comparison: votesByParty.slice(0, 5), // Top 5 candidates for comparison
    },

    // Statistics data
    statistics: {
      overview: {
        registeredVoters: totalRegisteredVoters,
        totalVotesCast,
        validVotes,
        invalidVotes,
        voterTurnout: Math.round(turnoutPercentage * 100) / 100,
        pollingUnitsReported: reportedCount,
        totalPollingUnits,
        reportingPercentage: Math.round(reportingPercentage * 100) / 100,
      },
      byRegion: votesByRegion,
      byAge: [], // Placeholder - implement if age data is available
      byGender: [], // Placeholder - implement if gender data is available
      turnoutByRegion: votesByRegion.map((region: any) => ({
        regionName: region.region_name,
        turnoutPercentage: region.percentage,
        statesReported: region.states_reported,
        totalStatesInZone: region.total_states_in_zone,
      })),
      recentActivity: recentActivity.map(vote => ({
        id: vote.id,
        timestamp: vote.voteTimestamp,
        source: vote.voteSource,
        pollingUnit: vote.pollingUnit?.pollingUnitName,
        state: vote.pollingUnit?.state,
        lga: vote.pollingUnit?.lga,
        candidate: vote.candidate?.fullName,
        party: vote.candidate?.partyCode,
      })),
    },

    // Live updates data
    liveUpdates: [
      {
        id: 1,
        type: 'announcement',
        title: 'INEC Announcement',
        message: 'Polls will remain open for the full 3-week period to accommodate all voters.',
        timestamp: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
        icon: 'announcement',
      },
      {
        id: 2,
        type: 'results',
        title: 'Results Update',
        message: `${Math.round(reportingPercentage)}% of polling units have reported. Current turnout at ${Math.round(turnoutPercentage)}%.`,
        timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
        icon: 'chart',
      },
      {
        id: 3,
        type: 'security',
        title: 'Security Alert',
        message:
          'Secure Ballot has detected and blocked several unauthorized access attempts. All votes remain secure and uncompromised.',
        timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        icon: 'shield',
      },
    ],
  };
};
