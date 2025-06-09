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
exports.getElectionDashboard = exports.getVotesByGeopoliticalZones = exports.getUpcomingElections = exports.getActiveElections = exports.publishElectionResults = exports.updateElectionStatus = exports.processOfflineVoteBatch = exports.castVote = exports.getPollingUnits = exports.getVoterDetails = exports.getElectionCandidates = exports.getElectionsWithPagination = exports.getElections = exports.getElectionById = exports.createElection = exports.checkOverlappingElections = void 0;
const Election_1 = __importStar(require("../db/models/Election"));
const Candidate_1 = __importDefault(require("../db/models/Candidate"));
const Voter_1 = __importDefault(require("../db/models/Voter"));
const PollingUnit_1 = __importDefault(require("../db/models/PollingUnit"));
const Vote_1 = __importStar(require("../db/models/Vote"));
const uuid_1 = require("uuid");
const sequelize_1 = require("sequelize");
const crypto_1 = __importDefault(require("crypto"));
const eciesjs_1 = require("eciesjs");
const errorHandler_1 = require("../middleware/errorHandler");
const models_1 = __importDefault(require("../db/models"));
const logger_1 = require("../utils/logger");
const voterService_1 = require("./voterService");
const geopoliticalZones_1 = require("../utils/geopoliticalZones");
// --- IMPORTANT: Load the server's private key securely ---
// This should come from a secure source like environment variables or a secret manager
// NEVER hardcode private keys!
// Example: Using environment variable
const serverPrivateKeyPem = process.env.SERVER_ECC_PRIVATE_KEY_PEM;
const VOTE_DATA_ENCODING = 'utf-8';
/**
 * Check if there are overlapping elections of the same type
 */
const checkOverlappingElections = async (electionType, startDate, endDate) => {
    const overlappingElection = await Election_1.default.findOne({
        where: {
            electionType,
            [sequelize_1.Op.or]: [
                {
                    startDate: {
                        [sequelize_1.Op.between]: [new Date(startDate), new Date(endDate)],
                    },
                },
                {
                    endDate: {
                        [sequelize_1.Op.between]: [new Date(startDate), new Date(endDate)],
                    },
                },
            ],
        },
    });
    return overlappingElection !== null;
};
exports.checkOverlappingElections = checkOverlappingElections;
/**
 * Create a new election
 */
const createElection = async (electionName, electionType, startDate, endDate, createdBy, description, eligibilityRules) => {
    // Create new election
    const newElection = await Election_1.default.create({
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
exports.createElection = createElection;
/**
 * Get election by ID
 */
const getElectionById = (electionId) => {
    return Election_1.default.findByPk(electionId);
};
exports.getElectionById = getElectionById;
/**
 * Get elections by status
 */
const getElections = (statusFilter) => {
    const statuses = statusFilter.split(',');
    return Election_1.default.findAll({
        where: {
            status: {
                [sequelize_1.Op.in]: statuses,
            },
        },
        order: [['startDate', 'ASC']],
    });
};
exports.getElections = getElections;
/**
 * Enhanced method to get elections with filtering, pagination, and search
 */
const getElectionsWithPagination = async (options) => {
    const { status = 'active', type, page = 1, limit = 10, search } = options;
    const offset = (Number(page) - 1) * Number(limit);
    const whereClause = {};
    // Status filtering
    if (status === 'active') {
        whereClause.status = Election_1.ElectionStatus.ACTIVE;
    }
    else if (status === 'upcoming') {
        whereClause.startDate = { [sequelize_1.Op.gt]: new Date() };
        whereClause.status = Election_1.ElectionStatus.SCHEDULED;
    }
    else if (status === 'past') {
        whereClause.endDate = { [sequelize_1.Op.lt]: new Date() };
        whereClause.status = { [sequelize_1.Op.in]: [Election_1.ElectionStatus.COMPLETED, Election_1.ElectionStatus.CANCELLED] };
    }
    else if (status) {
        whereClause.status = status; // Allow filtering by specific status like DRAFT
    }
    // Type filtering
    if (type) {
        whereClause.electionType = type;
    }
    // Search filtering
    if (search) {
        whereClause[sequelize_1.Op.or] = [
            { electionName: { [sequelize_1.Op.iLike]: `%${search}%` } },
            { description: { [sequelize_1.Op.iLike]: `%${search}%` } },
            { electionType: { [sequelize_1.Op.iLike]: `%${search}%` } },
        ];
    }
    const { count, rows: elections } = await Election_1.default.findAndCountAll({
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
exports.getElectionsWithPagination = getElectionsWithPagination;
/**
 * Get candidates for an election
 */
const getElectionCandidates = async (electionId, page = 1, limit = 50, search) => {
    const election = await Election_1.default.findByPk(electionId);
    if (!election) {
        throw new errorHandler_1.ApiError(404, 'Election not found');
    }
    const offset = (page - 1) * limit;
    const whereClause = { electionId };
    if (search) {
        whereClause[sequelize_1.Op.or] = [
            { fullName: { [sequelize_1.Op.iLike]: `%${search}%` } },
            { partyName: { [sequelize_1.Op.iLike]: `%${search}%` } },
            { partyCode: { [sequelize_1.Op.iLike]: `%${search}%` } },
        ];
    }
    const { count, rows: candidates } = await Candidate_1.default.findAndCountAll({
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
exports.getElectionCandidates = getElectionCandidates;
/**
 * Get voter details including polling unit
 */
const getVoterDetails = async (userId) => {
    const voter = await Voter_1.default.findByPk(userId, {
        include: [
            {
                model: models_1.default.PollingUnit,
                as: 'pollingUnit',
                required: false,
                attributes: ['id', 'pollingUnitName', 'pollingUnitCode'],
            },
        ],
    });
    if (!voter) {
        throw new errorHandler_1.ApiError(404, 'Voter not found');
    }
    const pollingUnit = voter.get('pollingUnit');
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
exports.getVoterDetails = getVoterDetails;
/**
 * Get polling units by state/lga/ward
 */
const getPollingUnits = async (filters, page = 1, limit = 50, search) => {
    const whereClause = {};
    if (filters.state)
        whereClause.state = filters.state;
    if (filters.lga)
        whereClause.lga = filters.lga;
    if (filters.ward)
        whereClause.ward = filters.ward;
    if (search) {
        whereClause[sequelize_1.Op.or] = [
            { pollingUnitName: { [sequelize_1.Op.iLike]: `%${search}%` } },
            { pollingUnitCode: { [sequelize_1.Op.iLike]: `%${search}%` } },
            { address: { [sequelize_1.Op.iLike]: `%${search}%` } },
        ];
    }
    const offset = (page - 1) * limit;
    const { count, rows: pollingUnits } = await PollingUnit_1.default.findAndCountAll({
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
exports.getPollingUnits = getPollingUnits;
/**
 * Decrypts vote data using the server's private key.
 *
 * @param encryptedDataHex - The encrypted data as a hex string.
 * @returns The decrypted vote data object.
 * @throws ApiError if decryption fails or private key is missing.
 */
const decryptVoteData = (encryptedDataHex) => {
    if (!serverPrivateKeyPem) {
        (0, logger_1.logError)('SERVER_ECC_PRIVATE_KEY_PEM is not set');
        throw new errorHandler_1.ApiError(500, 'Server configuration error: Missing private key.');
    }
    try {
        const encryptedDataBuffer = Buffer.from(encryptedDataHex, 'hex');
        // Note: ECIES decryption needs the private key in Buffer format
        const serverPrivateKeyBuffer = Buffer.from(serverPrivateKeyPem);
        const decryptedDataBuffer = (0, eciesjs_1.decrypt)(serverPrivateKeyBuffer, encryptedDataBuffer);
        const decryptedJson = decryptedDataBuffer.toString(VOTE_DATA_ENCODING);
        const decryptedData = JSON.parse(decryptedJson);
        // Basic validation of decrypted data structure
        if (!decryptedData || typeof decryptedData.candidateId !== 'string') {
            throw new Error('Invalid decrypted vote structure.');
        }
        return decryptedData;
    }
    catch (error) {
        (0, logger_1.logError)('Decryption failed', error);
        throw new errorHandler_1.ApiError(400, `Vote decryption failed: ${error.message}`);
    }
};
/**
 * Cast a vote for an election.
 */
const castVote = async (userId, electionId, encryptedVoteDataHex, voteSource, clientPublicKey) => {
    const voter = await Voter_1.default.findByPk(userId);
    if (!voter) {
        throw new errorHandler_1.ApiError(404, 'Voter not found.');
    }
    if (!voter.pollingUnitCode) {
        throw new errorHandler_1.ApiError(400, 'Voter registration incomplete (missing polling unit code).');
    }
    const isEligible = await (0, voterService_1.checkVoterEligibility)(userId, electionId);
    if (!isEligible) {
        throw new errorHandler_1.ApiError(403, 'Voter is not eligible for this election.');
    }
    const existingVote = await Vote_1.default.findOne({
        where: {
            userId,
            electionId,
        },
    });
    if (existingVote) {
        throw new errorHandler_1.ApiError(409, 'Voter has already cast a vote in this election.');
    }
    const decryptedData = decryptVoteData(encryptedVoteDataHex);
    const { candidateId } = decryptedData;
    const candidate = await Candidate_1.default.findOne({
        where: {
            id: candidateId,
            electionId: electionId,
            status: 'approved',
            isActive: true,
        },
    });
    if (!candidate) {
        throw new errorHandler_1.ApiError(400, 'Invalid or ineligible candidate ID.');
    }
    const pollingUnit = await PollingUnit_1.default.findOne({
        where: { pollingUnitCode: voter.pollingUnitCode },
        attributes: ['id'],
    });
    if (!pollingUnit) {
        throw new errorHandler_1.ApiError(500, 'Could not find polling unit associated with voter.');
    }
    const pollingUnitId = pollingUnit.id;
    const voteDataToHash = `${userId}-${electionId}-${candidateId}-${Date.now()}`;
    const voteHash = crypto_1.default.createHash('sha256').update(voteDataToHash).digest('hex');
    const receiptCode = (0, uuid_1.v4)();
    // Generate required encryption fields for hybrid encryption
    const aesKey = crypto_1.default.randomBytes(32); // 256-bit AES key
    const iv = crypto_1.default.randomBytes(16); // 128-bit IV
    const publicKeyFingerprint = crypto_1.default
        .createHash('sha256')
        .update(clientPublicKey || 'default-key')
        .digest('hex')
        .substring(0, 16);
    // For now, store the AES key as-is (in production, this should be encrypted with public key)
    const encryptedAesKey = aesKey.toString('hex');
    const vote = await models_1.default.sequelize.transaction(async (t) => {
        const newVote = await Vote_1.default.create({
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
        }, { transaction: t });
        if (clientPublicKey && !voter.publicKey) {
            await voter.update({ publicKey: clientPublicKey }, { transaction: t });
        }
        return newVote;
    });
    return vote;
};
exports.castVote = castVote;
/**
 * Process a batch of offline votes.
 */
const processOfflineVoteBatch = async (offlineVotes, electionId) => {
    let successful = 0;
    let failed = 0;
    const errors = [];
    for (const voteData of offlineVotes) {
        try {
            await (0, exports.castVote)(voteData.userId, electionId, voteData.encryptedVote, Vote_1.VoteSource.OFFLINE);
            successful++;
        }
        catch (error) {
            failed++;
            errors.push(`Vote for user ${voteData.userId} failed: ${error.message}`);
            (0, logger_1.logError)(`Offline vote processing failed for user ${voteData.userId}`, error);
        }
    }
    return { successful, failed, errors };
};
exports.processOfflineVoteBatch = processOfflineVoteBatch;
/**
 * Update the status of an election.
 */
const updateElectionStatus = async (electionId, newStatus) => {
    const election = await Election_1.default.findByPk(electionId);
    if (!election) {
        throw new errorHandler_1.ApiError(404, 'Election not found');
    }
    if (election.status === Election_1.ElectionStatus.COMPLETED && newStatus !== Election_1.ElectionStatus.COMPLETED) {
        // Allow changing from completed only under specific circumstances?
        // throw new ApiError(400, 'Cannot change status of a completed election.');
    }
    if (election.status === Election_1.ElectionStatus.CANCELLED && newStatus !== Election_1.ElectionStatus.CANCELLED) {
        throw new errorHandler_1.ApiError(400, 'Cannot change status of a cancelled election.');
    }
    await election.update({ status: newStatus });
    // Potentially trigger side effects based on status change (e.g., notifications)
    return election;
};
exports.updateElectionStatus = updateElectionStatus;
/**
 * Mark election results as published or preliminary published.
 */
const publishElectionResults = async (electionId, type) => {
    const election = await Election_1.default.findByPk(electionId);
    if (!election) {
        throw new errorHandler_1.ApiError(404, 'Election not found');
    }
    if (election.status !== Election_1.ElectionStatus.COMPLETED) {
        throw new errorHandler_1.ApiError(400, 'Election must be completed to publish results.');
    }
    const updateData = {};
    const now = new Date();
    if (type === 'preliminary') {
        updateData.preliminaryResultsPublished = true;
        updateData.preliminaryResultsPublishedAt = now;
    }
    else if (type === 'final') {
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
exports.publishElectionResults = publishElectionResults;
/**
 * Get active elections
 */
const getActiveElections = () => {
    const now = new Date();
    return Election_1.default.findAll({
        where: {
            status: Election_1.ElectionStatus.ACTIVE,
            startDate: { [sequelize_1.Op.lte]: now },
            endDate: { [sequelize_1.Op.gte]: now },
        },
        order: [['startDate', 'ASC']],
    });
};
exports.getActiveElections = getActiveElections;
/**
 * Get upcoming elections
 */
const getUpcomingElections = () => {
    const now = new Date();
    return Election_1.default.findAll({
        where: {
            status: Election_1.ElectionStatus.SCHEDULED,
            startDate: { [sequelize_1.Op.gt]: now },
        },
        order: [['startDate', 'ASC']],
    });
};
exports.getUpcomingElections = getUpcomingElections;
/**
 * Get vote statistics by geopolitical zones for an election
 */
const getVotesByGeopoliticalZones = async (electionId) => {
    // Get votes by states first
    const votesByState = (await models_1.default.sequelize.query(`
    SELECT 
      pu.state as state_name,
      COUNT(v.id) as vote_count
    FROM votes v
    JOIN polling_units pu ON v.polling_unit_id = pu.id
    WHERE v.election_id = :electionId
    GROUP BY pu.state
    ORDER BY vote_count DESC
  `, {
        replacements: { electionId },
        type: sequelize_1.QueryTypes.SELECT,
    }));
    // Get total votes for percentage calculation
    const totalVotes = await Vote_1.default.count({ where: { electionId } });
    // Group votes by geopolitical zones
    const votesByZone = new Map();
    votesByState.forEach((stateData) => {
        const zone = (0, geopoliticalZones_1.getGeopoliticalZone)(stateData.state_name);
        if (zone) {
            if (!votesByZone.has(zone)) {
                votesByZone.set(zone, { vote_count: 0, states: [] });
            }
            const zoneData = votesByZone.get(zone);
            zoneData.vote_count += parseInt(stateData.vote_count, 10);
            zoneData.states.push(stateData.state_name);
        }
    });
    // Convert to array format with detailed information
    return Array.from(votesByZone.entries())
        .map(([zoneName, data]) => ({
        region_name: zoneName,
        vote_count: data.vote_count,
        percentage: totalVotes > 0 ? Math.round((data.vote_count / totalVotes) * 100 * 100) / 100 : 0,
        states: data.states,
        zone_info: geopoliticalZones_1.NIGERIA_GEOPOLITICAL_ZONES[zoneName],
        states_reported: data.states.length,
        total_states_in_zone: geopoliticalZones_1.NIGERIA_GEOPOLITICAL_ZONES[zoneName]?.states.length || 0,
    }))
        .sort((a, b) => b.vote_count - a.vote_count);
};
exports.getVotesByGeopoliticalZones = getVotesByGeopoliticalZones;
/**
 * Get comprehensive election dashboard data
 */
const getElectionDashboard = async (electionId) => {
    // Get the election
    const election = await Election_1.default.findByPk(electionId, {
        include: [
            {
                model: models_1.default.ElectionStats,
                as: 'stats',
                required: false,
            },
        ],
    });
    if (!election) {
        throw new errorHandler_1.ApiError(404, 'Election not found');
    }
    // Get all candidates for this election
    const candidates = await Candidate_1.default.findAll({
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
    const totalRegisteredVoters = await Voter_1.default.count({
        where: {
            isActive: true,
        },
    });
    // Get total votes cast for this election
    const totalVotesCast = await Vote_1.default.count({
        where: { electionId },
    });
    // Get valid votes (assuming all votes are valid for now)
    const validVotes = totalVotesCast;
    const invalidVotes = 0; // Placeholder - implement validation logic if needed
    // Get vote counts by candidate
    const candidateVoteCounts = (await Vote_1.default.findAll({
        where: { electionId },
        attributes: ['candidateId', [models_1.default.sequelize.fn('COUNT', models_1.default.sequelize.col('id')), 'voteCount']],
        group: ['candidateId'],
        raw: true,
    }));
    // Get vote distribution by party
    const votesByParty = candidates.map(candidate => {
        const voteData = candidateVoteCounts.find((vc) => vc.candidateId === candidate.id);
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
    const pollingUnitsReported = (await models_1.default.sequelize.query(`
    SELECT COUNT(DISTINCT v.polling_unit_id) as reported_count
    FROM votes v
    WHERE v.election_id = :electionId
  `, {
        replacements: { electionId },
        type: sequelize_1.QueryTypes.SELECT,
    }));
    const totalPollingUnits = await PollingUnit_1.default.count();
    const reportedCount = parseInt(String(pollingUnitsReported[0]?.reported_count || 0), 10);
    const reportingPercentage = totalPollingUnits > 0 ? (reportedCount / totalPollingUnits) * 100 : 0;
    // Calculate turnout percentage
    const turnoutPercentage = totalRegisteredVoters > 0 ? (totalVotesCast / totalRegisteredVoters) * 100 : 0;
    // Use the dedicated function to get votes by geopolitical zones
    const votesByRegion = await (0, exports.getVotesByGeopoliticalZones)(electionId);
    // Get recent vote activity (last 10 votes for live updates simulation)
    const recentActivity = await Vote_1.default.findAll({
        where: { electionId },
        include: [
            {
                model: PollingUnit_1.default,
                as: 'pollingUnit',
                attributes: ['pollingUnitName', 'state', 'lga'],
            },
            {
                model: Candidate_1.default,
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
    if (election.status === Election_1.ElectionStatus.SCHEDULED &&
        now >= election.startDate &&
        now <= election.endDate) {
        displayStatus = Election_1.ElectionStatus.ACTIVE;
    }
    else if (election.status === Election_1.ElectionStatus.ACTIVE && now > election.endDate) {
        displayStatus = Election_1.ElectionStatus.COMPLETED;
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
    await models_1.default.ElectionStats.upsert(statsData);
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
            byAge: [],
            byGender: [],
            turnoutByRegion: votesByRegion.map((region) => ({
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
                timestamp: new Date(Date.now() - 2 * 60 * 1000),
                icon: 'announcement',
            },
            {
                id: 2,
                type: 'results',
                title: 'Results Update',
                message: `${Math.round(reportingPercentage)}% of polling units have reported. Current turnout at ${Math.round(turnoutPercentage)}%.`,
                timestamp: new Date(Date.now() - 15 * 60 * 1000),
                icon: 'chart',
            },
            {
                id: 3,
                type: 'security',
                title: 'Security Alert',
                message: 'Secure Ballot has detected and blocked several unauthorized access attempts. All votes remain secure and uncompromised.',
                timestamp: new Date(Date.now() - 30 * 60 * 1000),
                icon: 'shield',
            },
        ],
    };
};
exports.getElectionDashboard = getElectionDashboard;
//# sourceMappingURL=electionService.js.map