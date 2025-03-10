import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';
import Candidate from '../db/models/Candidate';
import Election from '../db/models/Election';

/**
 * Get all candidates for an election
 */
export const getCandidates = async (
  electionId: string,
  search?: string,
  page: number = 1,
  limit: number = 50
): Promise<{
  candidates: Candidate[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}> => {
  // Build filter conditions
  const whereConditions: any = {
    electionId
  };
  
  if (search) {
    whereConditions[Op.or] = [
      { fullName: { [Op.like]: `%${search}%` } },
      { partyAffiliation: { [Op.like]: `%${search}%` } }
    ];
  }
  
  // Calculate pagination
  const offset = (page - 1) * limit;
  
  // Fetch candidates with pagination
  const { count, rows: candidates } = await Candidate.findAndCountAll({
    where: whereConditions,
    limit,
    offset,
    order: [['fullName', 'ASC']]
  });
  
  // Calculate pagination metadata
  const totalPages = Math.ceil(count / limit);
  
  return {
    candidates,
    pagination: {
      total: count,
      page,
      limit,
      totalPages
    }
  };
};

/**
 * Get candidate by ID
 */
export const getCandidateById = async (id: string): Promise<Candidate> => {
  const candidate = await Candidate.findByPk(id, {
    include: [
      {
        model: Election,
        as: 'election',
        attributes: ['id', 'electionName', 'electionType', 'startDate', 'endDate', 'status']
      }
    ]
  });
  
  if (!candidate) {
    throw new Error('Candidate not found');
  }
  
  return candidate;
};

/**
 * Create a new candidate
 */
export const createCandidate = async (
  fullName: string,
  electionId: string,
  partyAffiliation: string,
  position: string,
  biography?: string,
  photoUrl?: string
): Promise<Candidate> => {
  // Check if election exists
  const election = await Election.findByPk(electionId);
  if (!election) {
    throw new Error('Election not found');
  }
  
  // Create new candidate
  const candidate = await Candidate.create({
    id: uuidv4(),
    fullName,
    electionId,
    partyCode: partyAffiliation.substring(0, 10), // Use first 10 chars as code
    partyName: partyAffiliation,
    position,
    bio: biography || null,
    photoUrl: photoUrl || null
  });
  
  return candidate;
};

/**
 * Update a candidate
 */
export const updateCandidate = async (
  id: string,
  updates: {
    fullName?: string;
    partyAffiliation?: string;
    position?: string;
    biography?: string;
    photoUrl?: string;
  }
): Promise<Candidate> => {
  const candidate = await Candidate.findByPk(id);
  
  if (!candidate) {
    throw new Error('Candidate not found');
  }
  
  // Prepare updates
  const updateData: any = {};
  
  if (updates.fullName) updateData.fullName = updates.fullName;
  if (updates.position) updateData.position = updates.position;
  if (updates.photoUrl !== undefined) updateData.photoUrl = updates.photoUrl;
  
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

/**
 * Delete a candidate
 */
export const deleteCandidate = async (id: string): Promise<boolean> => {
  const candidate = await Candidate.findByPk(id);
  
  if (!candidate) {
    throw new Error('Candidate not found');
  }
  
  await candidate.destroy();
  
  return true;
}; 