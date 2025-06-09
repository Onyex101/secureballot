import ElectionStats from '../db/models/ElectionStats';
/**
 * Get live election results
 */
export declare const getLiveResults: (electionId: string) => Promise<{
    electionId: string;
    electionName: string;
    totalVotes: number;
    validVotes: number;
    invalidVotes: number;
    registeredVoters: number;
    turnoutPercentage: number;
    candidates: {
        id: string;
        name: string;
        partyName: string;
        partyCode: string;
        votes: number;
        percentage: number;
    }[];
    lastUpdated: Date;
}>;
/**
 * Get results by region
 */
export declare const getResultsByRegion: (electionId: string, regionType: 'state' | 'lga' | 'ward', regionCode?: string) => Promise<{
    electionId: string;
    electionName: string;
    regionType: "state" | "lga" | "ward";
    regions: {
        name: string;
        code: string;
        totalVotes: number;
        candidates: {
            id: string;
            name: string;
            partyName: string;
            partyCode: string;
            votes: number;
            percentage: number;
        }[];
    }[];
    lastUpdated: Date;
}>;
/**
 * Get election statistics
 */
export declare const getElectionStatistics: (electionId: string) => Promise<ElectionStats>;
