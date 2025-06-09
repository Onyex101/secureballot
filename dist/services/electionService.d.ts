import Election, { ElectionStatus } from '../db/models/Election';
import Candidate from '../db/models/Candidate';
import PollingUnit from '../db/models/PollingUnit';
import Vote, { VoteSource } from '../db/models/Vote';
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
export declare const checkOverlappingElections: (electionType: string, startDate: string, endDate: string) => Promise<boolean>;
/**
 * Create a new election
 */
export declare const createElection: (electionName: string, electionType: string, startDate: string, endDate: string, createdBy: string, description?: string, eligibilityRules?: any) => Promise<Election>;
/**
 * Get election by ID
 */
export declare const getElectionById: (electionId: string) => Promise<Election | null>;
/**
 * Get elections by status
 */
export declare const getElections: (statusFilter: string) => Promise<Election[]>;
/**
 * Enhanced method to get elections with filtering, pagination, and search
 */
export declare const getElectionsWithPagination: (options: GetElectionsOptions) => Promise<ElectionsPaginationResult>;
/**
 * Get candidates for an election
 */
export declare const getElectionCandidates: (electionId: string, page?: number, limit?: number, search?: string) => Promise<{
    election: {
        id: string;
        name: string;
        type: string;
        status: ElectionStatus;
    };
    candidates: Candidate[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}>;
/**
 * Get voter details including polling unit
 */
export declare const getVoterDetails: (userId: string) => Promise<{
    id: string;
    nin: string;
    vin: string;
    phoneNumber: string;
    pollingUnit: {
        id: string;
        name: string;
        code: string;
    } | null;
}>;
/**
 * Get polling units by state/lga/ward
 */
export declare const getPollingUnits: (filters: {
    state?: string;
    lga?: string;
    ward?: string;
}, page?: number, limit?: number, search?: string) => Promise<{
    pollingUnits: PollingUnit[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}>;
/**
 * Cast a vote for an election.
 */
export declare const castVote: (userId: string, electionId: string, encryptedVoteDataHex: string, voteSource: VoteSource, clientPublicKey?: string) => Promise<Vote>;
/**
 * Process a batch of offline votes.
 */
export declare const processOfflineVoteBatch: (offlineVotes: {
    userId: string;
    encryptedVote: string;
}[], electionId: string) => Promise<{
    successful: number;
    failed: number;
    errors: string[];
}>;
/**
 * Update the status of an election.
 */
export declare const updateElectionStatus: (electionId: string, newStatus: ElectionStatus) => Promise<Election>;
/**
 * Mark election results as published or preliminary published.
 */
export declare const publishElectionResults: (electionId: string, type: 'preliminary' | 'final') => Promise<Election>;
/**
 * Get active elections
 */
export declare const getActiveElections: () => Promise<Election[]>;
/**
 * Get upcoming elections
 */
export declare const getUpcomingElections: () => Promise<Election[]>;
/**
 * Get vote statistics by geopolitical zones for an election
 */
export declare const getVotesByGeopoliticalZones: (electionId: string) => Promise<{
    region_name: string;
    vote_count: number;
    percentage: number;
    states: string[];
    zone_info: import("../utils/geopoliticalZones").GeopoliticalZone;
    states_reported: number;
    total_states_in_zone: number;
}[]>;
/**
 * Get comprehensive election dashboard data
 */
export declare const getElectionDashboard: (electionId: string) => Promise<{
    overview: {
        election: {
            id: string;
            electionName: string;
            electionType: string;
            startDate: Date;
            endDate: Date;
            description: string | null;
            status: ElectionStatus;
            displayStatus: ElectionStatus;
        };
        statistics: {
            totalVotesCast: number;
            validVotes: number;
            invalidVotes: number;
            voterTurnout: number;
            totalRegisteredVoters: number;
            pollingUnitsReported: string;
            reportingPercentage: number;
        };
        voteDistribution: {
            candidateId: string;
            candidateName: string;
            partyName: string;
            partyCode: string;
            votes: number;
            percentage: number;
        }[];
        lastUpdated: Date;
    };
    candidates: {
        totalCandidates: number;
        candidatesList: {
            id: string;
            fullName: string;
            partyName: string;
            partyCode: string;
            bio: string | null;
            photoUrl: string | null;
            position: string | null;
            manifesto: string | null;
            status: import("../db/models/Candidate").CandidateStatus;
            votes: number;
            percentage: number;
        }[];
        comparison: {
            candidateId: string;
            candidateName: string;
            partyName: string;
            partyCode: string;
            votes: number;
            percentage: number;
        }[];
    };
    statistics: {
        overview: {
            registeredVoters: number;
            totalVotesCast: number;
            validVotes: number;
            invalidVotes: number;
            voterTurnout: number;
            pollingUnitsReported: number;
            totalPollingUnits: number;
            reportingPercentage: number;
        };
        byRegion: {
            region_name: string;
            vote_count: number;
            percentage: number;
            states: string[];
            zone_info: import("../utils/geopoliticalZones").GeopoliticalZone;
            states_reported: number;
            total_states_in_zone: number;
        }[];
        byAge: never[];
        byGender: never[];
        turnoutByRegion: {
            regionName: any;
            turnoutPercentage: any;
            statesReported: any;
            totalStatesInZone: any;
        }[];
        recentActivity: {
            id: string;
            timestamp: Date;
            source: VoteSource;
            pollingUnit: string | undefined;
            state: string | undefined;
            lga: string | undefined;
            candidate: string | undefined;
            party: string | undefined;
        }[];
    };
    liveUpdates: {
        id: number;
        type: string;
        title: string;
        message: string;
        timestamp: Date;
        icon: string;
    }[];
}>;
export {};
