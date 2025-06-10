import logger from '../utils/logger';
import { getElectionById, getVotesByGeopoliticalZones } from './electionService';
import { getLiveResults, getResultsByRegion } from './resultService';
import { checkVoterEligibility } from './voterService';
import ElectionStats from '../db/models/ElectionStats';
import Vote from '../db/models/Vote';
import Candidate from '../db/models/Candidate';
import PollingUnit from '../db/models/PollingUnit';
import Voter from '../db/models/Voter';
import db from '../db/models';
import { QueryTypes } from 'sequelize';
import { getGeopoliticalZone, NIGERIA_GEOPOLITICAL_ZONES } from '../utils/geopoliticalZones';

class AppError extends Error {
  statusCode: number;
  details?: any;

  constructor(message: string, statusCode: number, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'AppError';
  }
}

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

class DashboardService {
  async getComprehensiveDashboardData(request: DashboardRequest): Promise<DashboardResponse> {
    try {
      logger.info('Generating dashboard data', { electionId: request.electionId });

      const startTime = Date.now();
      let queryCount = 0;

      // Validate election exists
      const election = await getElectionById(request.electionId);
      queryCount++;

      if (!election) {
        throw new AppError('Election not found', 404);
      }

      // Parallel data fetching for performance
      const [liveResults, _electionStats, regionalBreakdown, pollingUnitsData, votingStatus] =
        await Promise.all([
          this.getLiveResults(request.electionId),
          this.getElectionStats(request.electionId),
          request.includeRegionalBreakdown ? this.getRegionalBreakdown(request.electionId) : null,
          this.getPollingUnitsStats(request.electionId),
          request.userId
            ? this.getVotingStatus(request.electionId, request.userId)
            : this.getDefaultVotingStatus(),
        ]);

      queryCount += 5;

      // Get registered voters count
      const totalRegisteredVoters = await Voter.count({ where: { isActive: true } });
      queryCount++;

      // Transform election data
      const electionInfo: ElectionInfo = {
        id: election.id,
        title: election.electionName,
        type: this.mapElectionType(election.electionType),
        status: this.mapElectionStatus(election.status),
        startDate: election.startDate.toISOString(),
        endDate: election.endDate.toISOString(),
        description: election.description || undefined,
        totalRegisteredVoters,
        totalPollingUnits: pollingUnitsData.total,
      };

      // Transform candidates data
      const candidates = liveResults.candidates.map((candidate: any, index: number) => ({
        id: candidate.id,
        fullName: candidate.name,
        partyName: candidate.partyName,
        partyCode: candidate.partyCode,
        votes: candidate.votes,
        percentage: candidate.percentage,
        color: this.generateColor(index),
        ranking: index + 1,
      }));

      // Overview stats
      const overview: OverviewStats = {
        totalVotesCast: liveResults.totalVotes,
        voterTurnout: liveResults.turnoutPercentage,
        validVotes: liveResults.validVotes,
        invalidVotes: liveResults.invalidVotes,
        totalRegisteredVoters,
        pollingUnitsReported: `${pollingUnitsData.reported}/${pollingUnitsData.total}`,
        reportingPercentage: pollingUnitsData.reportingPercentage,
      };

      // Statistics
      const statistics: ElectionStatistics = {
        totalVotesCast: liveResults.totalVotes,
        validVotes: liveResults.validVotes,
        invalidVotes: liveResults.invalidVotes,
        turnoutPercentage: liveResults.turnoutPercentage,
        candidateResults: liveResults.candidates.map((c: any) => ({
          candidateId: c.id,
          candidateName: c.name,
          partyName: c.partyName,
          partyCode: c.partyCode,
          votes: c.votes,
          percentage: c.percentage,
        })),
        regionalBreakdown: regionalBreakdown || [],
        demographics: await this.getDemographics(request.electionId),
        voteDistribution: liveResults.candidates.map((c: any) => ({
          candidateId: c.id,
          candidateName: c.name,
          partyName: c.partyName,
          partyCode: c.partyCode,
          votes: c.votes,
          percentage: c.percentage,
        })),
      };

      // Real-time data
      const realTime: RealTimeData = {
        pollingUnitsReported: pollingUnitsData.reported,
        totalPollingUnits: pollingUnitsData.total,
        reportingPercentage: pollingUnitsData.reportingPercentage,
        lastUpdated: new Date().toISOString(),
        liveUpdates: request.includeRealTime ? await this.getLiveUpdates(request.electionId) : [],
        recentActivity: request.includeRealTime
          ? await this.getRecentActivity(request.electionId)
          : [],
      };

      const dashboardData: DashboardResponse = {
        election: electionInfo,
        overview,
        candidates,
        statistics,
        realTime,
        voting: votingStatus,
        metadata: {
          dataSource: 'Secure Ballot Database',
          generatedAt: new Date().toISOString(),
          cacheExpiry: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          apiVersion: '1.0.0',
          totalQueries: queryCount,
          responseTime: Date.now() - startTime,
        },
        timestamp: new Date().toISOString(),
      };

      // Add regional data if requested
      if (request.includeRegionalBreakdown && regionalBreakdown) {
        dashboardData.regional = {
          breakdown: regionalBreakdown,
          turnoutByRegion: await this.getRegionalTurnout(request.electionId),
          stateResults: await this.getStateResults(request.electionId),
        };
        queryCount += 2;
      }

      return dashboardData;
    } catch (error) {
      logger.error('Error in getComprehensiveDashboardData:', error, {
        electionId: request.electionId,
      });
      throw error;
    }
  }

  private getLiveResults(electionId: string) {
    return getLiveResults(electionId);
  }

  private getElectionStats(electionId: string) {
    return ElectionStats.findOne({ where: { electionId } });
  }

  private async getPollingUnitsStats(_electionId: string) {
    // Get total polling units
    const total = await PollingUnit.count();

    // For now, assume all polling units have reported
    // This could be enhanced to track actual reporting status
    const reported = total;
    const reportingPercentage = total > 0 ? Math.round((reported / total) * 1000) / 10 : 0;

    return { total, reported, reportingPercentage };
  }

  private async getRegionalBreakdown(electionId: string): Promise<RegionalBreakdown[]> {
    try {
      const regionalData = await getVotesByGeopoliticalZones(electionId);
      return regionalData.map((region: any) => ({
        regionName: region.zone,
        voteCount: region.totalVotes,
        percentage: region.percentage,
        statesReported: region.statesReported || 0,
        totalStatesInZone: region.totalStates || 0,
        turnoutPercentage: region.turnoutPercentage || 0,
        leadingParty: region.leadingParty,
      }));
    } catch (error) {
      logger.error('Error fetching regional breakdown:', error);
      return [];
    }
  }

  private async getDemographics(electionId: string): Promise<Demographics> {
    try {
      // Get age distribution from voters who have voted
      const ageGroupQuery = (await db.sequelize.query(
        `
        SELECT 
          CASE 
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, v_voter.date_of_birth)) BETWEEN 18 AND 25 THEN '18-25'
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, v_voter.date_of_birth)) BETWEEN 26 AND 35 THEN '26-35'
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, v_voter.date_of_birth)) BETWEEN 36 AND 45 THEN '36-45'
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, v_voter.date_of_birth)) BETWEEN 46 AND 55 THEN '46-55'
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, v_voter.date_of_birth)) BETWEEN 56 AND 65 THEN '56-65'
            ELSE '65+'
          END as age_range,
          COUNT(*) as vote_count
        FROM votes v
        JOIN voters v_voter ON v.user_id = v_voter.id
        WHERE v.election_id = :electionId
        GROUP BY age_range
        ORDER BY vote_count DESC
      `,
        {
          replacements: { electionId },
          type: QueryTypes.SELECT,
        },
      )) as any[];

      // Get gender distribution from voters who have voted
      const genderQuery = (await db.sequelize.query(
        `
        SELECT 
          v_voter.gender,
          COUNT(*) as vote_count
        FROM votes v
        JOIN voters v_voter ON v.user_id = v_voter.id
        WHERE v.election_id = :electionId
        GROUP BY v_voter.gender
      `,
        {
          replacements: { electionId },
          type: QueryTypes.SELECT,
        },
      )) as any[];

      // Calculate total votes for percentages
      const totalVotes = await Vote.count({ where: { electionId } });

      // Transform age groups
      const ageGroups: AgeGroup[] = ageGroupQuery.map((group: any) => ({
        range: group.age_range,
        voteCount: parseInt(group.vote_count, 10),
        percentage:
          totalVotes > 0
            ? Math.round((parseInt(group.vote_count, 10) / totalVotes) * 10000) / 100
            : 0,
      }));

      // Transform gender data
      const genderData = genderQuery.reduce(
        (acc: any, item: any) => {
          acc[item.gender.toLowerCase()] = parseInt(item.vote_count, 10);
          return acc;
        },
        { male: 0, female: 0 },
      );

      return {
        ageGroups,
        gender: genderData,
      };
    } catch (error) {
      logger.error('Error fetching demographics:', error);
      return {
        ageGroups: [],
        gender: { male: 0, female: 0 },
      };
    }
  }

  private async getLiveUpdates(electionId: string): Promise<LiveUpdate[]> {
    try {
      // Get recent election-related activities as live updates
      const recentResults = (await db.sequelize.query(
        `
        SELECT 
          CONCAT('result-', ROW_NUMBER() OVER (ORDER BY created_at DESC)) as id,
          'results' as type,
          CONCAT('New results from ', pu.polling_unit_name) as title,
          CONCAT('Latest vote counts updated for ', pu.state, ' - ', pu.lga) as message,
          created_at as timestamp,
          'medium' as priority,
          'polling_unit' as source
        FROM votes v
        JOIN polling_units pu ON v.polling_unit_id = pu.id
        WHERE v.election_id = :electionId
        GROUP BY pu.id, pu.polling_unit_name, pu.state, pu.lga, DATE_TRUNC('hour', v.created_at)
        ORDER BY MAX(v.created_at) DESC
        LIMIT 5
      `,
        {
          replacements: { electionId },
          type: QueryTypes.SELECT,
        },
      )) as any[];

      // Add system announcements (could be from a dedicated announcements table)
      const systemUpdates: LiveUpdate[] = [
        {
          id: 'system-1',
          type: 'announcement',
          title: 'Election Progress Update',
          message: 'Voting is proceeding smoothly across all regions',
          timestamp: new Date().toISOString(),
          priority: 'medium',
          source: 'system',
        },
      ];

      const formattedResults: LiveUpdate[] = recentResults.map((result: any) => ({
        id: result.id,
        type: result.type as any,
        title: result.title,
        message: result.message,
        timestamp: new Date(result.timestamp).toISOString(),
        priority: result.priority as any,
        source: result.source,
      }));

      return [...systemUpdates, ...formattedResults].slice(0, 10);
    } catch (error) {
      logger.error('Error fetching live updates:', error);
      return [
        {
          id: 'default-1',
          type: 'announcement',
          title: 'Election in Progress',
          message: 'Real-time updates are being processed',
          timestamp: new Date().toISOString(),
          priority: 'low',
          source: 'system',
        },
      ];
    }
  }

  private async getRecentActivity(electionId: string): Promise<RecentActivity[]> {
    try {
      const recentVotes = await Vote.findAll({
        where: { electionId },
        include: [
          {
            model: PollingUnit,
            as: 'polling_unit',
            attributes: ['pollingUnitName', 'state', 'lga'],
          },
          {
            model: Candidate,
            as: 'candidate',
            attributes: ['fullName', 'partyName'],
          },
        ],
        order: [['voteTimestamp', 'DESC']],
        limit: 10,
      });

      return recentVotes.map((vote: any) => ({
        id: vote.id,
        timestamp: vote.voteTimestamp.toISOString(),
        source: vote.voteSource || 'web',
        pollingUnit: vote.polling_unit?.pollingUnitName || 'Unknown',
        state: vote.polling_unit?.state || 'Unknown',
        lga: vote.polling_unit?.lga || 'Unknown',
        candidate: vote.candidate?.fullName,
        party: vote.candidate?.partyName,
        activityType: 'vote_cast' as const,
      }));
    } catch (error) {
      logger.error('Error fetching recent activity:', error);
      return [];
    }
  }

  private async getVotingStatus(electionId: string, userId: string): Promise<VotingStatus> {
    try {
      // Check if user has voted
      const existingVote = await Vote.findOne({
        where: { userId, electionId },
        include: [{ model: Candidate, as: 'candidate' }],
      });

      // Check eligibility
      const eligibility = await checkVoterEligibility(userId, electionId);

      return {
        hasVoted: !!existingVote,
        canVote: eligibility.isEligible,
        votedCandidateId: existingVote?.candidateId,
        voteTimestamp: existingVote?.voteTimestamp?.toISOString(),
        eligibilityReason:
          eligibility.reason ||
          (eligibility.isEligible ? 'User is eligible to vote' : 'User is not eligible'),
      };
    } catch (error) {
      logger.error('Error checking voting status:', error);
      return this.getDefaultVotingStatus();
    }
  }

  private getDefaultVotingStatus(): VotingStatus {
    return {
      hasVoted: false,
      canVote: false,
      eligibilityReason: 'User authentication required',
    };
  }

  private async getRegionalTurnout(electionId: string): Promise<RegionTurnout[]> {
    try {
      // Get votes by state
      const stateVotes = (await db.sequelize.query(
        `
        SELECT 
          pu.state,
          COUNT(v.id) as total_votes,
          COUNT(DISTINCT pu.id) as polling_units_reported
        FROM votes v
        JOIN polling_units pu ON v.polling_unit_id = pu.id
        WHERE v.election_id = :electionId
        GROUP BY pu.state
      `,
        {
          replacements: { electionId },
          type: QueryTypes.SELECT,
        },
      )) as any[];

      // Get registered voters by state (approximation)
      const registeredVotersByState = (await db.sequelize.query(
        `
        SELECT 
          state,
          COUNT(*) as registered_voters
        FROM voters
        WHERE is_active = true
        GROUP BY state
      `,
        {
          type: QueryTypes.SELECT,
        },
      )) as any[];

      // Group by geopolitical zones
      const regionalTurnout = new Map<
        string,
        {
          totalVotes: number;
          registeredVoters: number;
          statesReported: number;
          totalStatesInZone: number;
        }
      >();

      stateVotes.forEach((stateData: any) => {
        const zone = getGeopoliticalZone(stateData.state);
        if (zone) {
          const registeredInState = registeredVotersByState.find(
            (r: any) => r.state === stateData.state,
          );

          if (!regionalTurnout.has(zone)) {
            regionalTurnout.set(zone, {
              totalVotes: 0,
              registeredVoters: 0,
              statesReported: 0,
              totalStatesInZone: NIGERIA_GEOPOLITICAL_ZONES[zone]?.states.length || 0,
            });
          }

          const zoneData = regionalTurnout.get(zone)!;
          zoneData.totalVotes += parseInt(stateData.total_votes, 10);
          zoneData.registeredVoters += registeredInState
            ? parseInt(registeredInState.registered_voters, 10)
            : 0;
          zoneData.statesReported += 1;
        }
      });

      return Array.from(regionalTurnout.entries()).map(([regionName, data]) => ({
        regionName,
        turnoutPercentage:
          data.registeredVoters > 0
            ? Math.round((data.totalVotes / data.registeredVoters) * 10000) / 100
            : 0,
        statesReported: data.statesReported,
        totalStatesInZone: data.totalStatesInZone,
        totalVotes: data.totalVotes,
        registeredVoters: data.registeredVoters,
      }));
    } catch (error) {
      logger.error('Error fetching regional turnout:', error);
      return [];
    }
  }

  private async getStateResults(electionId: string): Promise<StateResult[]> {
    try {
      const stateResults = await getResultsByRegion(electionId, 'state');
      return (
        stateResults.regions?.map((region: any) => ({
          state: region.regionIdentifier,
          leadingParty: region.leadingCandidate?.partyCode || 'Unknown',
          percentage: region.leadingCandidate?.percentage || 0,
          totalVotes: region.totalVotes,
          turnoutPercentage: region.turnoutPercentage || 0,
          reportingStatus: 'partial' as const,
        })) || []
      );
    } catch (error) {
      logger.error('Error fetching state results:', error);
      return [];
    }
  }

  private mapElectionType(
    type: string,
  ): 'presidential' | 'gubernatorial' | 'house-of-reps' | 'senatorial' {
    const typeMap: Record<
      string,
      'presidential' | 'gubernatorial' | 'house-of-reps' | 'senatorial'
    > = {
      Presidential: 'presidential',
      Gubernatorial: 'gubernatorial',
      HouseOfReps: 'house-of-reps',
      Senatorial: 'senatorial',
    };
    return typeMap[type] || 'presidential';
  }

  private mapElectionStatus(status: string): 'upcoming' | 'active' | 'completed' | 'suspended' {
    const statusMap: Record<string, 'upcoming' | 'active' | 'completed' | 'suspended'> = {
      draft: 'upcoming',
      scheduled: 'upcoming',
      active: 'active',
      completed: 'completed',
      paused: 'suspended',
      cancelled: 'suspended',
    };
    return statusMap[status] || 'upcoming';
  }

  private generateColor(index: number): string {
    const colors = [
      '#0066CC',
      '#FF0000',
      '#00AA00',
      '#800080',
      '#FF8800',
      '#008080',
      '#CC0066',
      '#666600',
      '#CC6600',
      '#0080FF',
    ];
    return colors[index % colors.length];
  }
}

export const dashboardService = new DashboardService();
