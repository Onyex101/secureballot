interface VotingStatistics {
    totalRegisteredVoters: number;
    totalVotesCast: number;
    validVotes: number;
    invalidVotes: number;
    voterTurnoutPercentage: number;
    validVotePercentage: number;
    invalidVotePercentage: number;
}
interface CandidateStatistic {
    candidateId: string;
    name: string;
    party: string;
    partyCode: string;
    votes: number;
    percentage: number;
    rank: number;
}
interface PollingUnitStatistics {
    totalPollingUnits: number;
    pollingUnitsReported: number;
    reportingPercentage: number;
    pollingUnitsNotReported: number;
    averageVotesPerPollingUnit: number;
}
interface ElectionStatistics {
    electionId: string;
    electionName: string;
    electionType: string;
    status: string;
    lastUpdated: string;
    votingStatistics: VotingStatistics;
    candidateStatistics: CandidateStatistic[];
    pollingUnitStatistics: PollingUnitStatistics;
}
export declare class StatisticsService {
    /**
     * Get comprehensive election statistics
     */
    getElectionStatistics(electionId: string): Promise<ElectionStatistics>;
    /**
     * Get basic election information
     */
    private getElectionInfo;
    /**
     * Get voting statistics using raw SQL
     */
    private getVotingStatistics;
    /**
     * Get candidate statistics using raw SQL
     */
    private getCandidateStatistics;
    /**
     * Get polling unit statistics using raw SQL
     */
    private getPollingUnitStatistics;
    /**
     * Get real-time statistics for live updates
     */
    getRealTimeStatistics(electionId: string): Promise<{
        totalVotes: number;
        lastVoteTimestamp: Date | null;
        activePollingUnits: number;
    }>;
}
export declare const statisticsService: StatisticsService;
export declare const getElectionStatistics: (electionId: string) => Promise<ElectionStatistics>;
export declare const getElectionResults: (electionId: string, includeBreakdown?: boolean) => Promise<{
    electionId: string;
    electionName: string;
    electionType: string;
    status: string;
    totalVotesCast: number;
    results: {
        candidateId: string;
        candidateName: string;
        partyAffiliation: string;
        totalVotes: number;
        percentage: number;
        pollingUnitBreakdown: never[] | null;
    }[];
}>;
export declare const getRealTimeVotingStats: () => {
    timestamp: Date;
    activeElections: never[];
    totalVotesToday: number;
};
export {};
