"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCandidate = exports.updateCandidate = exports.createMultipleCandidates = exports.createCandidate = exports.getCandidateById = exports.getCandidates = void 0;
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
            { partyName: { [sequelize_1.Op.like]: `%${search}%` } },
            { partyCode: { [sequelize_1.Op.like]: `%${search}%` } },
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
 * Create multiple candidates
 */
const createMultipleCandidates = async (electionId, candidatesData) => {
    // Check if election exists
    const election = await Election_1.default.findByPk(electionId);
    if (!election) {
        throw new Error('Election not found');
    }
    // Check for duplicate party codes within the same election
    const partyCodes = candidatesData.map(c => c.partyCode);
    const uniquePartyCodes = [...new Set(partyCodes)];
    if (partyCodes.length !== uniquePartyCodes.length) {
        throw new Error('Duplicate party codes are not allowed in the same election');
    }
    // Check if any party codes already exist for this election
    const existingCandidates = await Candidate_1.default.findAll({
        where: {
            electionId,
            partyCode: { [sequelize_1.Op.in]: partyCodes },
        },
    });
    if (existingCandidates.length > 0) {
        const existingPartyCodes = existingCandidates.map(c => c.partyCode);
        throw new Error(`Party codes already exist for this election: ${existingPartyCodes.join(', ')}`);
    }
    // Prepare candidates for creation
    const candidatesToCreate = candidatesData.map(candidateData => ({
        id: (0, uuid_1.v4)(),
        electionId,
        fullName: candidateData.fullName,
        partyCode: candidateData.partyCode,
        partyName: candidateData.partyName,
        position: candidateData.position || null,
        bio: candidateData.bio || null,
        photoUrl: candidateData.photoUrl || null,
        manifesto: candidateData.manifesto || null,
    }));
    // Create all candidates
    const createdCandidates = await Candidate_1.default.bulkCreate(candidatesToCreate, {
        returning: true,
    });
    return createdCandidates;
};
exports.createMultipleCandidates = createMultipleCandidates;
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
    if (updates.partyCode)
        updateData.partyCode = updates.partyCode;
    if (updates.partyName)
        updateData.partyName = updates.partyName;
    if (updates.position !== undefined)
        updateData.position = updates.position;
    if (updates.bio !== undefined)
        updateData.bio = updates.bio;
    if (updates.photoUrl !== undefined)
        updateData.photoUrl = updates.photoUrl;
    if (updates.manifesto !== undefined)
        updateData.manifesto = updates.manifesto;
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