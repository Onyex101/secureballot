import { VoteSource } from '../db/models/Vote';
/**
 * Cast a vote in an election
 */
export declare const castVote: (voterId: string, electionId: string, candidateId: string, pollingUnitId: string, voteSource?: VoteSource) => Promise<{
    id: string;
    voteHash: string;
    receiptCode: string;
    timestamp: Date;
}>;
/**
 * Verify a vote using receipt code
 */
export declare const verifyVote: (receiptCode: string) => Promise<{
    isValid: boolean;
    message: string;
    timestamp?: undefined;
    electionName?: undefined;
    candidateName?: undefined;
    candidateParty?: undefined;
    pollingUnit?: undefined;
    voteSource?: undefined;
} | {
    isValid: boolean;
    timestamp: Date;
    electionName: string | undefined;
    candidateName: string | undefined;
    candidateParty: string | undefined;
    pollingUnit: string | undefined;
    voteSource: VoteSource;
    message?: undefined;
}>;
/**
 * Get vote history for a voter
 */
export declare const getVoteHistory: (voterId: string) => Promise<{
    id: string;
    electionId: string;
    electionName: string | undefined;
    electionType: string | undefined;
    candidateName: string | undefined;
    candidateParty: string | undefined;
    pollingUnit: string | undefined;
    timestamp: Date;
    receiptCode: string;
    voteSource: VoteSource;
}[]>;
/**
 * Count votes for an election
 */
export declare const countVotes: (electionId: string) => Promise<{
    candidateId: any;
    candidateName: any;
    partyName: any;
    partyCode: any;
    voteCount: number;
}[]>;
