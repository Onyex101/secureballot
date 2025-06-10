interface DashboardRequest {
    electionId: string;
    userId?: string;
    includeRealTime?: boolean;
    includeRegionalBreakdown?: boolean;
}
interface DashboardResponse {
    election: ElectionInfo;
    overview: OverviewStats;
    candidates: CandidateResult[];
    statistics: ElectionStatistics;
    realTime: RealTimeData;
    regional?: RegionalData;
    voting: VotingStatus;
    metadata: Metadata;
    timestamp: string;
}
interface ElectionInfo {
    id: string;
    title: string;
    type: 'presidential' | 'gubernatorial' | 'house-of-reps' | 'senatorial';
    status: 'upcoming' | 'active' | 'completed' | 'suspended';
    startDate: string;
    endDate: string;
    description?: string;
    totalRegisteredVoters: number;
    totalPollingUnits: number;
}
interface OverviewStats {
    totalVotesCast: number;
    voterTurnout: number;
    validVotes: number;
    invalidVotes: number;
    totalRegisteredVoters: number;
    pollingUnitsReported: string;
    reportingPercentage: number;
}
interface CandidateResult {
    id: string;
    fullName: string;
    partyName: string;
    partyCode: string;
    photoUrl?: string;
    votes: number;
    percentage: number;
    manifesto?: string;
    bio?: string;
    color: string;
    ranking: number;
}
interface ElectionStatistics {
    totalVotesCast: number;
    validVotes: number;
    invalidVotes: number;
    turnoutPercentage: number;
    candidateResults: CandidateStatistic[];
    regionalBreakdown: RegionalBreakdown[];
    demographics: Demographics;
    voteDistribution: VoteDistribution[];
}
interface CandidateStatistic {
    candidateId: string;
    candidateName: string;
    partyName: string;
    partyCode: string;
    votes: number;
    percentage: number;
}
interface RegionalBreakdown {
    regionName: string;
    voteCount: number;
    percentage: number;
    statesReported: number;
    totalStatesInZone: number;
    turnoutPercentage: number;
    leadingParty?: string;
}
interface Demographics {
    ageGroups: AgeGroup[];
    gender: GenderBreakdown;
}
interface AgeGroup {
    range: string;
    percentage: number;
    voteCount: number;
}
interface GenderBreakdown {
    male: number;
    female: number;
}
interface VoteDistribution {
    candidateId: string;
    candidateName: string;
    partyName: string;
    partyCode: string;
    votes: number;
    percentage: number;
}
interface RealTimeData {
    pollingUnitsReported: number;
    totalPollingUnits: number;
    reportingPercentage: number;
    lastUpdated: string;
    liveUpdates: LiveUpdate[];
    recentActivity: RecentActivity[];
}
interface LiveUpdate {
    id: string;
    type: 'announcement' | 'results' | 'security' | 'update' | 'alert';
    title: string;
    message: string;
    timestamp: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    source: string;
}
interface RecentActivity {
    id: string;
    timestamp: string;
    source: 'web' | 'mobile' | 'ussd';
    pollingUnit: string;
    state: string;
    lga: string;
    candidate?: string;
    party?: string;
    activityType: 'vote_cast' | 'results_uploaded' | 'unit_reported';
}
interface RegionalData {
    breakdown: RegionalBreakdown[];
    turnoutByRegion: RegionTurnout[];
    stateResults: StateResult[];
}
interface RegionTurnout {
    regionName: string;
    turnoutPercentage: number;
    statesReported: number;
    totalStatesInZone: number;
    totalVotes: number;
    registeredVoters: number;
}
interface StateResult {
    state: string;
    leadingParty: string;
    percentage: number;
    totalVotes: number;
    turnoutPercentage: number;
    reportingStatus: 'complete' | 'partial' | 'pending';
}
interface VotingStatus {
    hasVoted: boolean;
    canVote: boolean;
    votedCandidateId?: string;
    voteTimestamp?: string;
    eligibilityReason?: string;
}
interface Metadata {
    dataSource: string;
    generatedAt: string;
    cacheExpiry: string;
    apiVersion: string;
    totalQueries: number;
    responseTime?: number;
}
declare class DashboardService {
    getComprehensiveDashboardData(request: DashboardRequest): Promise<DashboardResponse>;
    private getLiveResults;
    private getElectionStats;
    private getPollingUnitsStats;
    private getRegionalBreakdown;
    private getDemographics;
    private getLiveUpdates;
    private getRecentActivity;
    private getVotingStatus;
    private getDefaultVotingStatus;
    private getRegionalTurnout;
    private getStateResults;
    private mapElectionType;
    private mapElectionStatus;
    private generateColor;
}
export declare const dashboardService: DashboardService;
export {};
