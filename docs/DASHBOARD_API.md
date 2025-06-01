# SecureBallot Dashboard API Documentation

## Overview

The SecureBallot Dashboard API provides a comprehensive, single-endpoint solution for retrieving all election data needed for frontend dashboard applications. This API is designed for React/Next.js applications and provides real-time data in an optimized, frontend-ready format.

## Core Dashboard Endpoint

### `GET /api/v1/elections/{electionId}/dashboard`

Returns complete dashboard data including election overview, candidates, statistics, and live updates in a single API call.

**Authentication**: Required (Bearer token)

**Rate Limiting**: 100 requests per minute per user

---

## 📊 API Response Structure

```typescript
interface DashboardResponse {
  overview: ElectionOverview;
  candidates: CandidateData[];
  statistics: ElectionStatistics;
  liveUpdates: LiveUpdate[];
  meta: ResponseMeta;
}
```

### Complete Response Example

```json
{
  "overview": {
    "election": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "2024 Nigerian Presidential Election", 
      "type": "Presidential",
      "status": "Active",
      "startDate": "2024-02-25T08:00:00Z",
      "endDate": "2024-02-25T18:00:00Z",
      "description": "Presidential election to elect the next President of Nigeria",
      "isActive": true,
      "timeRemaining": "2h 15m 30s",
      "timezone": "Africa/Lagos"
    },
    "keyStatistics": {
      "totalRegisteredVoters": 95847362,
      "totalVotesCast": 28754208,
      "voterTurnout": 30.0,
      "totalPollingUnits": 176846,
      "pollingUnitsReporting": 125000,
      "reportingPercentage": 70.6,
      "lastUpdated": "2024-02-25T14:30:45Z"
    },
    "voteDistribution": {
      "totalVotes": 28754208,
      "validVotes": 28542891,
      "invalidVotes": 211317,
      "spoiltBallots": 34829,
      "accreditedVoters": 28780000,
      "validVotePercentage": 99.3
    }
  },
  "candidates": [
    {
      "id": "candidate-001",
      "name": "Alhaji Atiku Abubakar",
      "party": "PDP",
      "partyFullName": "People's Democratic Party",
      "partyColor": "#00A86B",
      "voteCount": 11794329,
      "votePercentage": 41.3,
      "rank": 1,
      "isLeading": true,
      "profileImage": "/images/candidates/atiku.jpg",
      "biography": "Former Vice President of Nigeria (1999-2007)",
      "regionalPerformance": {
        "strongestRegion": "North East",
        "strongestRegionPercentage": 67.8,
        "weakestRegion": "South West", 
        "weakestRegionPercentage": 18.9
      },
      "recentTrend": {
        "direction": "up",
        "changePercentage": 2.1,
        "timeFrame": "last_hour"
      }
    },
    {
      "id": "candidate-002", 
      "name": "Asiwaju Bola Ahmed Tinubu",
      "party": "APC",
      "partyFullName": "All Progressives Congress",
      "partyColor": "#FF0000",
      "voteCount": 10570486,
      "votePercentage": 37.0,
      "rank": 2,
      "isLeading": false,
      "profileImage": "/images/candidates/tinubu.jpg",
      "biography": "Former Governor of Lagos State (1999-2007)",
      "regionalPerformance": {
        "strongestRegion": "South West",
        "strongestRegionPercentage": 72.4,
        "weakestRegion": "South East",
        "weakestRegionPercentage": 8.2
      },
      "recentTrend": {
        "direction": "stable",
        "changePercentage": 0.3,
        "timeFrame": "last_hour"
      }
    },
    {
      "id": "candidate-003",
      "name": "Mr. Peter Gregory Obi",
      "party": "LP", 
      "partyFullName": "Labour Party",
      "partyColor": "#008000",
      "voteCount": 4897635,
      "votePercentage": 17.2,
      "rank": 3,
      "isLeading": false,
      "profileImage": "/images/candidates/obi.jpg",
      "biography": "Former Governor of Anambra State (2006-2014)",
      "regionalPerformance": {
        "strongestRegion": "South East",
        "strongestRegionPercentage": 89.1,
        "weakestRegion": "North West",
        "weakestRegionPercentage": 3.7
      },
      "recentTrend": {
        "direction": "up",
        "changePercentage": 1.8,
        "timeFrame": "last_hour"
      }
    }
  ],
  "statistics": {
    "regionalBreakdown": [
      {
        "region": "North Central",
        "states": ["FCT", "Benue", "Kogi", "Kwara", "Nasarawa", "Niger", "Plateau"],
        "totalRegisteredVoters": 12547893,
        "totalVotesCast": 3764368,
        "voterTurnout": 30.0,
        "reportingUnits": 22456,
        "totalUnits": 31205,
        "reportingPercentage": 71.9,
        "leadingCandidate": {
          "name": "Alhaji Atiku Abubakar",
          "party": "PDP",
          "voteCount": 1505747,
          "percentage": 40.0
        },
        "topThreeCandidates": [
          { "name": "Alhaji Atiku Abubakar", "party": "PDP", "votes": 1505747, "percentage": 40.0 },
          { "name": "Asiwaju Bola Ahmed Tinubu", "party": "APC", "votes": 1278924, "percentage": 34.0 },
          { "name": "Mr. Peter Gregory Obi", "party": "LP", "votes": 752873, "percentage": 20.0 }
        ]
      },
      {
        "region": "North East", 
        "states": ["Adamawa", "Bauchi", "Borno", "Gombe", "Taraba", "Yobe"],
        "totalRegisteredVoters": 11234567,
        "totalVotesCast": 3371370,
        "voterTurnout": 30.0,
        "reportingUnits": 18934,
        "totalUnits": 26785,
        "reportingPercentage": 70.7,
        "leadingCandidate": {
          "name": "Alhaji Atiku Abubakar", 
          "party": "PDP",
          "voteCount": 2285730,
          "percentage": 67.8
        },
        "topThreeCandidates": [
          { "name": "Alhaji Atiku Abubakar", "party": "PDP", "votes": 2285730, "percentage": 67.8 },
          { "name": "Asiwaju Bola Ahmed Tinubu", "party": "APC", "votes": 674274, "percentage": 20.0 },
          { "name": "Mr. Peter Gregory Obi", "party": "LP", "votes": 269712, "percentage": 8.0 }
        ]
      },
      {
        "region": "South East",
        "states": ["Abia", "Anambra", "Ebonyi", "Enugu", "Imo"],
        "totalRegisteredVoters": 8945678,
        "totalVotesCast": 2683704,
        "voterTurnout": 30.0,
        "reportingUnits": 12456,
        "totalUnits": 17891,
        "reportingPercentage": 69.6,
        "leadingCandidate": {
          "name": "Mr. Peter Gregory Obi",
          "party": "LP", 
          "voteCount": 2391781,
          "percentage": 89.1
        },
        "topThreeCandidates": [
          { "name": "Mr. Peter Gregory Obi", "party": "LP", "votes": 2391781, "percentage": 89.1 },
          { "name": "Alhaji Atiku Abubakar", "party": "PDP", "votes": 161022, "percentage": 6.0 },
          { "name": "Asiwaju Bola Ahmed Tinubu", "party": "APC", "votes": 134185, "percentage": 5.0 }
        ]
      }
    ],
    "channelDistribution": {
      "web": {
        "count": 17252525,
        "percentage": 60.0
      },
      "mobile": {
        "count": 8626263,
        "percentage": 30.0  
      },
      "ussd": {
        "count": 2875421,
        "percentage": 10.0
      }
    },
    "timeSeriesData": [
      { "time": "08:00", "cumulativeVotes": 0, "hourlyVotes": 0, "turnout": 0.0 },
      { "time": "09:00", "cumulativeVotes": 1250000, "hourlyVotes": 1250000, "turnout": 1.3 },
      { "time": "10:00", "cumulativeVotes": 3750000, "hourlyVotes": 2500000, "turnout": 3.9 },
      { "time": "11:00", "cumulativeVotes": 7250000, "hourlyVotes": 3500000, "turnout": 7.6 },
      { "time": "12:00", "cumulativeVotes": 12000000, "hourlyVotes": 4750000, "turnout": 12.5 },
      { "time": "13:00", "cumulativeVotes": 17500000, "hourlyVotes": 5500000, "turnout": 18.3 },
      { "time": "14:00", "cumulativeVotes": 23500000, "hourlyVotes": 6000000, "turnout": 24.5 },
      { "time": "15:00", "cumulativeVotes": 28754208, "hourlyVotes": 5254208, "turnout": 30.0 }
    ],
    "recentActivity": [
      {
        "timestamp": "2024-02-25T14:28:15Z",
        "type": "vote_surge", 
        "message": "High voting activity detected in Lagos State",
        "details": "45,000 votes in the last 30 minutes",
        "severity": "info"
      },
      {
        "timestamp": "2024-02-25T14:15:32Z",
        "type": "milestone",
        "message": "30% voter turnout milestone reached",
        "details": "28.7 million votes cast so far",
        "severity": "success"
      },
      {
        "timestamp": "2024-02-25T13:45:18Z",
        "type": "system_update",
        "message": "Mobile voting surge in FCT",
        "details": "Mobile channel usage increased by 200%",
        "severity": "info" 
      }
    ]
  },
  "liveUpdates": [
    {
      "id": "update-001",
      "timestamp": "2024-02-25T14:30:45Z",
      "type": "result_update",
      "title": "Lagos State Results Update",
      "message": "Lagos State reporting shows Tinubu leading with 72% of votes counted",
      "priority": "high",
      "category": "results",
      "affectedRegions": ["South West"],
      "author": "Result Verification Officer",
      "isVerified": true
    },
    {
      "id": "update-002", 
      "timestamp": "2024-02-25T14:25:12Z",
      "type": "technical_update",
      "title": "System Performance Update", 
      "message": "All voting channels operating normally. 99.8% uptime maintained.",
      "priority": "medium",
      "category": "system",
      "affectedRegions": ["All"],
      "author": "Technical Operations",
      "isVerified": true
    },
    {
      "id": "update-003",
      "timestamp": "2024-02-25T14:20:03Z", 
      "type": "security_alert",
      "title": "Security Monitoring Update",
      "message": "No security incidents detected. All encryption systems functioning normally.",
      "priority": "medium", 
      "category": "security",
      "affectedRegions": ["All"],
      "author": "Security Operations Center",
      "isVerified": true
    }
  ],
  "meta": {
    "requestId": "req_1234567890abcdef",
    "timestamp": "2024-02-25T14:30:45Z",
    "processingTime": "127ms",
    "dataVersion": "v2.1.0",
    "cacheStatus": "hit",
    "nextUpdate": "2024-02-25T14:31:45Z",
    "updateInterval": 60,
    "apiVersion": "1.0",
    "compression": "gzip"
  }
}
```

---

## 🔧 Frontend Integration Examples

### React Dashboard Component

```tsx
import React, { useState, useEffect } from 'react';
import { DashboardData, useDashboardData } from './hooks/useDashboardData';

interface DashboardProps {
  electionId: string;
}

const ElectionDashboard: React.FC<DashboardProps> = ({ electionId }) => {
  const { data, loading, error, refetch } = useDashboardData(electionId);

  if (loading) return <DashboardSkeleton />;
  if (error) return <ErrorDisplay error={error} />;
  if (!data) return <NoDataDisplay />;

  return (
    <div className="election-dashboard">
      {/* Overview Section */}
      <OverviewCard 
        election={data.overview.election}
        statistics={data.overview.keyStatistics}
        voteDistribution={data.overview.voteDistribution}
      />

      {/* Live Results */}
      <CandidateResults 
        candidates={data.candidates}
        totalVotes={data.overview.voteDistribution.totalVotes}
      />

      {/* Regional Breakdown */}
      <RegionalBreakdown 
        regions={data.statistics.regionalBreakdown}
      />

      {/* Live Updates Feed */}
      <LiveUpdatesFeed 
        updates={data.liveUpdates}
        onRefresh={refetch}
      />

      {/* Statistics Charts */}
      <StatisticsCharts 
        timeSeriesData={data.statistics.timeSeriesData}
        channelDistribution={data.statistics.channelDistribution}
      />
    </div>
  );
};
```

### Custom Hook for Dashboard Data

```tsx
import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../utils/apiClient';

export interface DashboardData {
  overview: ElectionOverview;
  candidates: CandidateData[];
  statistics: ElectionStatistics;
  liveUpdates: LiveUpdate[];
  meta: ResponseMeta;
}

export const useDashboardData = (electionId: string) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/elections/${electionId}/dashboard`);
      setData(response.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  }, [electionId]);

  useEffect(() => {
    fetchData();
    
    // Auto-refresh every minute
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
};
```

### Real-Time Updates with WebSocket

```tsx
import { useEffect, useRef } from 'react';

export const useRealTimeUpdates = (electionId: string, onUpdate: (data: DashboardData) => void) => {
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Establish WebSocket connection for real-time updates
    ws.current = new WebSocket(`wss://api.evoting.gov.ng/ws/elections/${electionId}/dashboard`);

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onUpdate(data);
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [electionId, onUpdate]);

  return ws.current;
};
```

---

## 🎨 UI Component Examples

### Overview Card Component

```tsx
interface OverviewCardProps {
  election: ElectionInfo;
  statistics: KeyStatistics;
  voteDistribution: VoteDistribution;
}

const OverviewCard: React.FC<OverviewCardProps> = ({ 
  election, 
  statistics, 
  voteDistribution 
}) => {
  return (
    <Card className="overview-card">
      <CardHeader>
        <h2>{election.name}</h2>
        <Badge status={election.status} />
      </CardHeader>
      
      <CardContent>
        <div className="stats-grid">
          <Statistic
            label="Total Votes Cast"
            value={statistics.totalVotesCast.toLocaleString()}
            change={`${statistics.voterTurnout}% turnout`}
            trend="up"
          />
          
          <Statistic
            label="Polling Units Reporting"
            value={`${statistics.pollingUnitsReporting.toLocaleString()}/${statistics.totalPollingUnits.toLocaleString()}`}
            change={`${statistics.reportingPercentage}%`}
            trend="stable"
          />
          
          <Statistic
            label="Valid Votes"
            value={voteDistribution.validVotes.toLocaleString()}
            change={`${voteDistribution.validVotePercentage}%`}
            trend="up"
          />
        </div>
        
        <TimeRemaining endTime={election.endDate} />
      </CardContent>
    </Card>
  );
};
```

### Candidate Results Component

```tsx
interface CandidateResultsProps {
  candidates: CandidateData[];
  totalVotes: number;
}

const CandidateResults: React.FC<CandidateResultsProps> = ({ 
  candidates, 
  totalVotes 
}) => {
  return (
    <Card className="candidate-results">
      <CardHeader>
        <h3>Live Results</h3>
        <RefreshButton />
      </CardHeader>
      
      <CardContent>
        {candidates.map((candidate, index) => (
          <CandidateRow
            key={candidate.id}
            candidate={candidate}
            rank={index + 1}
            totalVotes={totalVotes}
            isLeading={candidate.isLeading}
          />
        ))}
      </CardContent>
    </Card>
  );
};

const CandidateRow: React.FC<{
  candidate: CandidateData;
  rank: number;
  totalVotes: number;
  isLeading: boolean;
}> = ({ candidate, rank, totalVotes, isLeading }) => {
  return (
    <div className={`candidate-row ${isLeading ? 'leading' : ''}`}>
      <div className="candidate-info">
        <img src={candidate.profileImage} alt={candidate.name} />
        <div>
          <h4>{candidate.name}</h4>
          <span className="party" style={{ color: candidate.partyColor }}>
            {candidate.party} - {candidate.partyFullName}
          </span>
        </div>
      </div>
      
      <div className="vote-info">
        <div className="vote-count">
          {candidate.voteCount.toLocaleString()} votes
        </div>
        <div className="percentage">
          {candidate.votePercentage}%
        </div>
        <TrendIndicator trend={candidate.recentTrend} />
      </div>
      
      <ProgressBar 
        percentage={candidate.votePercentage}
        color={candidate.partyColor}
      />
    </div>
  );
};
```

---

## 📱 Mobile-Optimized Response

For mobile applications, you can request a lightweight version:

```bash
GET /api/v1/elections/{electionId}/dashboard?format=mobile&fields=overview,candidates
```

**Mobile Response Example:**
```json
{
  "overview": {
    "election": {
      "name": "2024 Presidential Election",
      "status": "Active", 
      "timeRemaining": "2h 15m"
    },
    "keyStatistics": {
      "totalVotesCast": 28754208,
      "voterTurnout": 30.0
    }
  },
  "candidates": [
    {
      "name": "Alhaji Atiku Abubakar",
      "party": "PDP",
      "votePercentage": 41.3,
      "isLeading": true
    }
  ],
  "meta": {
    "format": "mobile",
    "timestamp": "2024-02-25T14:30:45Z"
  }
}
```

---

## 🔍 Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `format` | string | Response format (`full`, `mobile`, `minimal`) | `?format=mobile` |
| `fields` | string | Comma-separated list of sections to include | `?fields=overview,candidates` |
| `refresh` | boolean | Force refresh of cached data | `?refresh=true` |
| `include_historical` | boolean | Include historical trend data | `?include_historical=true` |
| `region` | string | Filter statistics by region | `?region=south_west` |
| `time_range` | string | Time range for statistics (`1h`, `6h`, `24h`) | `?time_range=6h` |

---

## ⚡ Performance Optimization

### Caching Strategy
- **Redis cache**: 60-second cache for dashboard data
- **CDN caching**: Static assets cached for 24 hours  
- **Browser caching**: Client-side cache for 30 seconds
- **Partial updates**: Only changed data sent via WebSocket

### Response Compression
- **Gzip compression**: 70% size reduction
- **Selective fields**: Request only needed data sections
- **Pagination**: Large datasets paginated automatically

### Rate Limiting
- **Standard users**: 100 requests/minute
- **Admin users**: 1000 requests/minute  
- **Real-time updates**: Via WebSocket to reduce API calls

---

## 🔐 Security & Authentication

### Authentication Requirements
```bash
# Header required for all requests
Authorization: Bearer <jwt_token>

# Optional API key for additional security
X-API-Key: <api_key>
```

### Data Sensitivity Levels
- **Public data**: Election info, candidate names, public results
- **Restricted data**: Detailed statistics, real-time feeds  
- **Admin only**: Internal system metrics, audit logs

### Audit Logging
All dashboard API requests are logged with:
- User ID and role
- Timestamp and IP address
- Data sections accessed
- Response time and status

---

## 🚨 Error Handling

### Common Error Responses

```json
{
  "error": {
    "code": "ELECTION_NOT_FOUND",
    "message": "Election with ID 'invalid-id' not found",
    "details": {
      "electionId": "invalid-id", 
      "suggestedAction": "Verify the election ID and try again"
    },
    "timestamp": "2024-02-25T14:30:45Z",
    "requestId": "req_1234567890abcdef"
  }
}
```

### Error Codes
- `ELECTION_NOT_FOUND` (404): Invalid election ID
- `UNAUTHORIZED` (401): Missing or invalid authentication
- `FORBIDDEN` (403): Insufficient permissions  
- `RATE_LIMITED` (429): Too many requests
- `INTERNAL_ERROR` (500): Server error
- `DATA_UNAVAILABLE` (503): Service temporarily unavailable

---

## 📞 Support & Troubleshooting

### Common Issues

1. **Slow Response Times**
   - Use `?format=mobile` for faster responses
   - Request specific `?fields=` instead of full data
   - Check network connection and try again

2. **Missing Data**
   - Verify election is active: `election.status === "Active"`
   - Check user permissions for restricted data
   - Use `?refresh=true` to bypass cache

3. **Authentication Errors**
   - Ensure JWT token is valid and not expired
   - Include proper `Authorization: Bearer <token>` header
   - Contact admin if permissions are insufficient

### Contact Information
- **Technical Support**: api-support@evoting.gov.ng
- **Dashboard Issues**: dashboard-support@evoting.gov.ng  
- **Emergency**: +234-800-VOTE-HELP

---

**This dashboard API represents a comprehensive, production-ready solution for real-time election monitoring and results visualization, designed specifically for Nigerian electoral requirements and modern frontend frameworks.** 