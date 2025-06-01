# SecureBallot Dashboard Integration Guide

## Overview

This guide provides comprehensive integration examples for building frontend dashboards using SecureBallot's Dashboard API. Designed specifically for React/Next.js applications with real-time updates and responsive design.

## 🚀 Quick Start Integration

### Basic Setup

```bash
npm install axios react-query @types/react
```

### API Client Setup

```typescript
// utils/apiClient.ts
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://api.evoting.gov.ng/api/v1',
  timeout: 10000,
});

// Request interceptor for auth token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
```

### React Query Dashboard Hook

```typescript
// hooks/useDashboard.ts
import { useQuery } from 'react-query';
import apiClient from '../utils/apiClient';

export interface DashboardData {
  overview: ElectionOverview;
  candidates: CandidateData[];
  statistics: ElectionStatistics;
  liveUpdates: LiveUpdate[];
}

export const useDashboard = (electionId: string) => {
  return useQuery<DashboardData>(
    ['dashboard', electionId],
    async () => {
      const { data } = await apiClient.get(`/elections/${electionId}/dashboard`);
      return data;
    },
    {
      refetchInterval: 60000, // Refetch every minute
      staleTime: 30000,       // Data considered fresh for 30 seconds
      cacheTime: 300000,      // Cache for 5 minutes
    }
  );
};
```

## 📊 Complete Dashboard Component

```tsx
// components/ElectionDashboard.tsx
import React from 'react';
import { useDashboard } from '../hooks/useDashboard';
import { OverviewCard } from './OverviewCard';
import { CandidateResults } from './CandidateResults';
import { RegionalMap } from './RegionalMap';
import { LiveUpdates } from './LiveUpdates';
import { StatisticsCharts } from './StatisticsCharts';

interface Props {
  electionId: string;
}

export const ElectionDashboard: React.FC<Props> = ({ electionId }) => {
  const { data, isLoading, error, refetch } = useDashboard(electionId);

  if (isLoading) return <DashboardSkeleton />;
  if (error) return <ErrorBoundary error={error} />;
  if (!data) return <NoDataMessage />;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {data.overview.election.name}
        </h1>
        <div className="flex items-center gap-4 mt-2">
          <StatusBadge status={data.overview.election.status} />
          <TimeRemaining endTime={data.overview.election.endDate} />
          <RefreshButton onClick={() => refetch()} />
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Overview & Results */}
        <div className="lg:col-span-2 space-y-6">
          <OverviewCard 
            election={data.overview.election}
            statistics={data.overview.keyStatistics}
            voteDistribution={data.overview.voteDistribution}
          />
          
          <CandidateResults 
            candidates={data.candidates}
            totalVotes={data.overview.voteDistribution.totalVotes}
          />
          
          <RegionalMap 
            regions={data.statistics.regionalBreakdown}
            candidates={data.candidates}
          />
        </div>

        {/* Right Column - Live Updates & Stats */}
        <div className="space-y-6">
          <LiveUpdates 
            updates={data.liveUpdates}
            onRefresh={() => refetch()}
          />
          
          <StatisticsCharts 
            timeSeriesData={data.statistics.timeSeriesData}
            channelDistribution={data.statistics.channelDistribution}
          />
        </div>
      </div>
    </div>
  );
};
```

## 🎯 Core Components Implementation

### Overview Card Component

```tsx
// components/OverviewCard.tsx
import React from 'react';
import { Card, CardHeader, CardContent } from './ui/Card';
import { Statistic } from './ui/Statistic';

interface Props {
  election: ElectionInfo;
  statistics: KeyStatistics;
  voteDistribution: VoteDistribution;
}

export const OverviewCard: React.FC<Props> = ({ 
  election, 
  statistics, 
  voteDistribution 
}) => {
  return (
    <Card className="bg-white shadow-lg">
      <CardHeader className="border-b border-gray-200 pb-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Election Overview
            </h2>
            <p className="text-gray-600 mt-1">{election.description}</p>
          </div>
          <StatusBadge status={election.status} />
        </div>
      </CardHeader>
      
      <CardContent className="pt-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <Statistic
            label="Total Votes Cast"
            value={statistics.totalVotesCast.toLocaleString()}
            subtitle={`${statistics.voterTurnout}% turnout`}
            icon="📊"
            trend="up"
            color="blue"
          />
          
          <Statistic
            label="Valid Votes"
            value={voteDistribution.validVotes.toLocaleString()}
            subtitle={`${voteDistribution.validVotePercentage}% valid`}
            icon="✅"
            trend="stable"
            color="green"
          />
          
          <Statistic
            label="Polling Units"
            value={`${statistics.pollingUnitsReporting.toLocaleString()}/${statistics.totalPollingUnits.toLocaleString()}`}
            subtitle={`${statistics.reportingPercentage}% reporting`}
            icon="🏢"
            trend="up"
            color="purple"
          />
          
          <Statistic
            label="Last Updated"
            value={formatTimeAgo(statistics.lastUpdated)}
            subtitle="Real-time data"
            icon="🕒"
            trend="stable"
            color="gray"
          />
        </div>
      </CardContent>
    </Card>
  );
};
```

### Candidate Results Component

```tsx
// components/CandidateResults.tsx
import React from 'react';
import { Card, CardHeader, CardContent } from './ui/Card';
import { ProgressBar } from './ui/ProgressBar';
import { TrendIndicator } from './ui/TrendIndicator';

interface Props {
  candidates: CandidateData[];
  totalVotes: number;
}

export const CandidateResults: React.FC<Props> = ({ candidates, totalVotes }) => {
  return (
    <Card className="bg-white shadow-lg">
      <CardHeader className="border-b border-gray-200 pb-4">
        <h3 className="text-xl font-semibold text-gray-900">Live Results</h3>
      </CardHeader>
      
      <CardContent className="pt-6">
        <div className="space-y-4">
          {candidates.map((candidate, index) => (
            <CandidateRow
              key={candidate.id}
              candidate={candidate}
              rank={index + 1}
              isLeading={candidate.isLeading}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const CandidateRow: React.FC<{
  candidate: CandidateData;
  rank: number;
  isLeading: boolean;
}> = ({ candidate, rank, isLeading }) => {
  return (
    <div className={`p-4 rounded-lg border-2 transition-all ${
      isLeading 
        ? 'border-yellow-400 bg-yellow-50' 
        : 'border-gray-200 bg-gray-50'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-4">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
            isLeading ? 'bg-yellow-500' : 'bg-gray-400'
          }`}>
            {rank}
          </div>
          
          <img 
            src={candidate.profileImage} 
            alt={candidate.name}
            className="w-12 h-12 rounded-full object-cover"
          />
          
          <div>
            <h4 className="font-semibold text-gray-900">{candidate.name}</h4>
            <div className="flex items-center space-x-2">
              <span 
                className="px-2 py-1 text-xs font-semibold rounded text-white"
                style={{ backgroundColor: candidate.partyColor }}
              >
                {candidate.party}
              </span>
              <span className="text-sm text-gray-600">
                {candidate.partyFullName}
              </span>
            </div>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900">
            {candidate.votePercentage}%
          </div>
          <div className="text-sm text-gray-600">
            {candidate.voteCount.toLocaleString()} votes
          </div>
          <TrendIndicator trend={candidate.recentTrend} />
        </div>
      </div>
      
      <ProgressBar 
        percentage={candidate.votePercentage}
        color={candidate.partyColor}
        height="h-3"
        showLabel={false}
      />
    </div>
  );
};
```

## 🗺️ Interactive Regional Map

```tsx
// components/RegionalMap.tsx
import React, { useState } from 'react';
import { Card, CardHeader, CardContent } from './ui/Card';

interface Props {
  regions: RegionalBreakdown[];
  candidates: CandidateData[];
}

export const RegionalMap: React.FC<Props> = ({ regions, candidates }) => {
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  return (
    <Card className="bg-white shadow-lg">
      <CardHeader className="border-b border-gray-200 pb-4">
        <h3 className="text-xl font-semibold text-gray-900">Regional Results</h3>
      </CardHeader>
      
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Map Visualization */}
          <div className="space-y-4">
            {regions.map((region) => (
              <RegionCard
                key={region.region}
                region={region}
                isSelected={selectedRegion === region.region}
                onClick={() => setSelectedRegion(region.region)}
              />
            ))}
          </div>
          
          {/* Selected Region Details */}
          {selectedRegion && (
            <RegionDetails 
              region={regions.find(r => r.region === selectedRegion)!}
              candidates={candidates}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const RegionCard: React.FC<{
  region: RegionalBreakdown;
  isSelected: boolean;
  onClick: () => void;
}> = ({ region, isSelected, onClick }) => {
  return (
    <div 
      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
        isSelected 
          ? 'border-blue-500 bg-blue-50' 
          : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={onClick}
    >
      <div className="flex justify-between items-center">
        <div>
          <h4 className="font-semibold text-gray-900">{region.region}</h4>
          <p className="text-sm text-gray-600">
            {region.totalVotesCast.toLocaleString()} votes • {region.voterTurnout}% turnout
          </p>
        </div>
        
        <div className="text-right">
          <div className="text-lg font-bold" style={{ 
            color: getCandidateColor(region.leadingCandidate.party) 
          }}>
            {region.leadingCandidate.name}
          </div>
          <div className="text-sm text-gray-600">
            {region.leadingCandidate.percentage}%
          </div>
        </div>
      </div>
      
      <div className="mt-3">
        <ProgressBar 
          percentage={region.reportingPercentage}
          color="#10B981"
          height="h-2"
          label={`${region.reportingPercentage}% units reporting`}
        />
      </div>
    </div>
  );
};
```

## 📡 Real-Time Updates

```tsx
// components/LiveUpdates.tsx
import React from 'react';
import { Card, CardHeader, CardContent } from './ui/Card';
import { formatTimeAgo } from '../utils/timeUtils';

interface Props {
  updates: LiveUpdate[];
  onRefresh: () => void;
}

export const LiveUpdates: React.FC<Props> = ({ updates, onRefresh }) => {
  return (
    <Card className="bg-white shadow-lg">
      <CardHeader className="border-b border-gray-200 pb-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-semibold text-gray-900">Live Updates</h3>
          <button 
            onClick={onRefresh}
            className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Refresh
          </button>
        </div>
      </CardHeader>
      
      <CardContent className="pt-6">
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {updates.map((update) => (
            <UpdateItem key={update.id} update={update} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const UpdateItem: React.FC<{ update: LiveUpdate }> = ({ update }) => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-500 bg-red-50';
      case 'medium': return 'border-yellow-500 bg-yellow-50';
      case 'low': return 'border-green-500 bg-green-50';
      default: return 'border-gray-500 bg-gray-50';
    }
  };

  return (
    <div className={`p-4 rounded-lg border-l-4 ${getPriorityColor(update.priority)}`}>
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-semibold text-gray-900">{update.title}</h4>
        <span className="text-xs text-gray-600">
          {formatTimeAgo(update.timestamp)}
        </span>
      </div>
      
      <p className="text-sm text-gray-700 mb-2">{update.message}</p>
      
      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-600">
          By {update.author}
        </span>
        {update.isVerified && (
          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
            ✓ Verified
          </span>
        )}
      </div>
    </div>
  );
};
```

## 📈 Statistics Charts

```tsx
// components/StatisticsCharts.tsx
import React from 'react';
import { Line, Doughnut } from 'react-chartjs-2';
import { Card, CardHeader, CardContent } from './ui/Card';

interface Props {
  timeSeriesData: TimeSeriesPoint[];
  channelDistribution: ChannelDistribution;
}

export const StatisticsCharts: React.FC<Props> = ({ 
  timeSeriesData, 
  channelDistribution 
}) => {
  return (
    <div className="space-y-6">
      {/* Voting Timeline */}
      <Card className="bg-white shadow-lg">
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900">Voting Timeline</h3>
        </CardHeader>
        <CardContent>
          <VotingTimelineChart data={timeSeriesData} />
        </CardContent>
      </Card>

      {/* Channel Distribution */}
      <Card className="bg-white shadow-lg">
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900">Voting Channels</h3>
        </CardHeader>
        <CardContent>
          <ChannelDistributionChart data={channelDistribution} />
        </CardContent>
      </Card>
    </div>
  );
};
```

## 🔄 WebSocket Integration

```typescript
// hooks/useWebSocket.ts
import { useEffect, useRef, useState } from 'react';

export const useWebSocket = (url: string, onMessage: (data: any) => void) => {
  const ws = useRef<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState('Connecting');

  useEffect(() => {
    ws.current = new WebSocket(url);
    
    ws.current.onopen = () => setConnectionStatus('Connected');
    ws.current.onclose = () => setConnectionStatus('Disconnected');
    ws.current.onerror = () => setConnectionStatus('Error');
    
    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onMessage(data);
    };

    return () => ws.current?.close();
  }, [url, onMessage]);

  return { connectionStatus };
};

// Usage in Dashboard
export const useLiveUpdates = (electionId: string) => {
  const [liveData, setLiveData] = useState(null);
  
  const { connectionStatus } = useWebSocket(
    `wss://api.evoting.gov.ng/ws/elections/${electionId}`,
    (data) => setLiveData(data)
  );

  return { liveData, connectionStatus };
};
```

## 🎨 Responsive Design

```css
/* styles/dashboard.css */
.election-dashboard {
  @apply min-h-screen bg-gray-50;
}

/* Mobile-first responsive grid */
.dashboard-grid {
  @apply grid grid-cols-1 gap-4;
}

@media (min-width: 768px) {
  .dashboard-grid {
    @apply grid-cols-2 gap-6;
  }
}

@media (min-width: 1024px) {
  .dashboard-grid {
    @apply grid-cols-3 gap-8;
  }
}

/* Card animations */
.dashboard-card {
  @apply transform transition-all duration-200 hover:scale-105 hover:shadow-lg;
}

/* Real-time indicators */
.live-indicator {
  @apply animate-pulse bg-green-500 rounded-full w-3 h-3;
}
```

## 🚀 Performance Optimization

### Memoization and Optimization

```tsx
// Optimized Dashboard Component
export const ElectionDashboard = React.memo<Props>(({ electionId }) => {
  const { data, isLoading, error } = useDashboard(electionId);
  
  // Memoize expensive calculations
  const chartData = useMemo(() => 
    processTimeSeriesData(data?.statistics.timeSeriesData),
    [data?.statistics.timeSeriesData]
  );

  const candidatesSorted = useMemo(() =>
    data?.candidates.sort((a, b) => b.voteCount - a.voteCount),
    [data?.candidates]
  );

  return (
    <div className="election-dashboard">
      {/* Component JSX */}
    </div>
  );
});
```

### Lazy Loading

```tsx
// Lazy load heavy components
const RegionalMap = lazy(() => import('./RegionalMap'));
const StatisticsCharts = lazy(() => import('./StatisticsCharts'));

// Use with Suspense
<Suspense fallback={<ComponentSkeleton />}>
  <RegionalMap regions={data.statistics.regionalBreakdown} />
</Suspense>
```

## 📱 Mobile Optimization

```tsx
// Mobile-optimized dashboard
export const MobileDashboard: React.FC<Props> = ({ electionId }) => {
  const { data } = useDashboard(electionId, { format: 'mobile' });
  
  return (
    <div className="mobile-dashboard">
      <SwipeableCards>
        <OverviewCard data={data.overview} />
        <CandidateResults candidates={data.candidates} />
        <LiveUpdates updates={data.liveUpdates} />
      </SwipeableCards>
    </div>
  );
};
```

## 🔐 Security Best Practices

### Token Management

```typescript
// Secure token storage and refresh
export class TokenManager {
  private static refreshToken() {
    // Implement secure token refresh logic
  }
  
  public static getAuthHeader() {
    const token = this.getValidToken();
    return token ? `Bearer ${token}` : null;
  }
}
```

---

**This integration guide provides production-ready patterns for building secure, performant, and responsive election dashboards using SecureBallot's comprehensive API.** 