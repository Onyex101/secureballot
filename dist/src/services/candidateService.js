"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCandidate = exports.updateCandidate = exports.createCandidate = exports.getCandidateById = exports.getCandidates = void 0;
const uuid_1 = require("uuid");
const sequelize_1 = require("sequelize");
const Candidate_1 = __importDefault(require("../db/models/Candidate"));
const Election_1 = __importDefault(require("../db/models/Election"));
/**
 * Get all candidates for an election
 */
const getCandidates = async (electionId, search, page = 1, limit = 50) => {
    // Build filter conditions
    const whereConditions = {
        electionId,
    };
    if (search) {
        whereConditions[sequelize_1.Op.or] = [
            { fullName: { [sequelize_1.Op.like]: `%${search}%` } },
            { partyAffiliation: { [sequelize_1.Op.like]: `%${search}%` } },
        ];
    }
    // Calculate pagination
    const offset = (page - 1) * limit;
    // Fetch candidates with pagination
    const { count, rows: candidates } = await Candidate_1.default.findAndCountAll({
        where: whereConditions,
        limit,
        offset,
        order: [['fullName', 'ASC']],
    });
    // Calculate pagination metadata
    const totalPages = Math.ceil(count / limit);
    return {
        candidates,
        pagination: {
            total: count,
            page,
            limit,
            totalPages,
        },
    };
};
exports.getCandidates = getCandidates;
/**
 * Get candidate by ID
 */
const getCandidateById = async (id) => {
    const candidate = await Candidate_1.default.findByPk(id, {
        include: [
            {
                model: Election_1.default,
                as: 'election',
                attributes: ['id', 'electionName', 'electionType', 'startDate', 'endDate', 'status'],
            },
        ],
    });
    if (!candidate) {
        throw new Error('Candidate not found');
    }
    return candidate;
};
exports.getCandidateById = getCandidateById;
/**
 * Create a new candidate
 */
const createCandidate = async (fullName, electionId, partyAffiliation, position, biography, photoUrl) => {
    // Check if election exists
    const election = await Election_1.default.findByPk(electionId);
    if (!election) {
        throw new Error('Election not found');
    }
    // Create new candidate
    const candidate = await Candidate_1.default.create({
        id: (0, uuid_1.v4)(),
        fullName,
        electionId,
        partyCode: partyAffiliation.substring(0, 10),
        partyName: partyAffiliation,
        position,
        bio: biography || null,
        photoUrl: photoUrl || null,
    });
    return candidate;
};
exports.createCandidate = createCandidate;
/**
 * Update a candidate
 */
const updateCandidate = async (id, updates) => {
    const candidate = await Candidate_1.default.findByPk(id);
    if (!candidate) {
        throw new Error('Candidate not found');
    }
    // Prepare updates
    const updateData = {};
    if (updates.fullName)
        updateData.fullName = updates.fullName;
    if (updates.position)
        updateData.position = updates.position;
    if (updates.photoUrl !== undefined)
        updateData.photoUrl = updates.photoUrl;
    // Handle party affiliation update
    if (updates.partyAffiliation) {
        updateData.partyCode = updates.partyAffiliation.substring(0, 10);
        updateData.partyName = updates.partyAffiliation;
    }
    // Handle biography update
    if (updates.biography !== undefined) {
        updateData.bio = updates.biography;
    }
    // Update candidate
    await candidate.update(updateData);
    return candidate;
};
exports.updateCandidate = updateCandidate;
/**
 * Delete a candidate
 */
const deleteCandidate = async (id) => {
    const candidate = await Candidate_1.default.findByPk(id);
    if (!candidate) {
        throw new Error('Candidate not found');
    }
    await candidate.destroy();
    return true;
};
exports.deleteCandidate = deleteCandidate;
//# sourceMappingURL=candidateService.js.map