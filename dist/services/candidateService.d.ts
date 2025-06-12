import Candidate from '../db/models/Candidate';
/**
 * Get all candidates for an election
 */
export declare const getCandidates: (electionId: string, search?: string, page?: number, limit?: number) => Promise<{
    candidates: Candidate[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}>;
/**
 * Get candidate by ID
 */
export declare const getCandidateById: (id: string) => Promise<Candidate>;
/**
 * Create a new candidate
 */
export declare const createCandidate: (fullName: string, electionId: string, partyAffiliation: string, position: string, biography?: string, photoUrl?: string) => Promise<Candidate>;
/**
 * Create multiple candidates
 */
export declare const createMultipleCandidates: (electionId: string, candidatesData: Array<{
    fullName: string;
    partyCode: string;
    partyName: string;
    position?: string;
    bio?: string;
    photoUrl?: string;
    manifesto?: string;
}>) => Promise<Candidate[]>;
/**
 * Update a candidate
 */
export declare const updateCandidate: (id: string, updates: {
    fullName?: string;
    partyCode?: string;
    partyName?: string;
    position?: string;
    bio?: string;
    photoUrl?: string;
    manifesto?: string;
}) => Promise<Candidate>;
/**
 * Delete a candidate
 */
export declare const deleteCandidate: (id: string) => Promise<boolean>;
