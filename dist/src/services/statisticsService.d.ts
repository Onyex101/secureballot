/**
 * Get election statistics
 */
export declare const getElectionStatistics: (electionId: string) => Promise<any>;
/**
 * Get election results
 */
export declare const getElectionResults: (electionId: string, includePollingUnitBreakdown?: boolean) => Promise<any>;
/**
 * Get real-time voting statistics
 */
export declare const getRealTimeVotingStats: () => Promise<any>;
