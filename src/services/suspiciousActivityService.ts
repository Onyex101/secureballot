import { Op } from 'sequelize';
import AuditLog from '../db/models/AuditLog';
import { logger } from '../config/logger';

export interface SuspiciousActivity {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  sourceIp: string;
  targetUserId?: string;
  targetResource?: string;
  detectedAt: Date;
  status: 'active' | 'investigated' | 'resolved' | 'false_positive';
  riskScore: number;
  actionType: string;
  userAgent?: string;
  additionalData?: any;
}

export interface SuspiciousActivityFilters {
  severity?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  sourceIp?: string;
  type?: string;
}

/**
 * Detect suspicious activities based on audit logs
 */
export const detectSuspiciousActivities = async (
  timeWindow: number = 24, // hours
): Promise<SuspiciousActivity[]> => {
  try {
    const suspiciousActivities: SuspiciousActivity[] = [];
    const windowStart = new Date(Date.now() - timeWindow * 60 * 60 * 1000);

    // Get recent audit logs for analysis
    const recentLogs = await AuditLog.findAll({
      where: {
        actionTimestamp: {
          [Op.gte]: windowStart,
        },
      },
      order: [['actionTimestamp', 'DESC']],
    });

    // Detect multiple failed login attempts
    const failedLogins = detectMultipleFailedLogins(recentLogs);
    suspiciousActivities.push(...failedLogins);

    // Detect unusual IP addresses
    const unusualIPs = await detectUnusualIPAddresses(recentLogs);
    suspiciousActivities.push(...unusualIPs);

    // Detect rapid successive actions
    const rapidActions = detectRapidSuccessiveActions(recentLogs);
    suspiciousActivities.push(...rapidActions);

    // Detect unusual time patterns
    const unusualTimes = detectUnusualTimePatterns(recentLogs);
    suspiciousActivities.push(...unusualTimes);

    return suspiciousActivities;
  } catch (error) {
    logger.error('Error detecting suspicious activities:', error);
    return [];
  }
};

/**
 * Detect multiple failed login attempts from same IP
 */
const detectMultipleFailedLogins = (logs: AuditLog[]): SuspiciousActivity[] => {
  const activities: SuspiciousActivity[] = [];
  const failedLoginsByIP: { [key: string]: AuditLog[] } = {};

  // Group failed logins by IP
  logs
    .filter(log => log.actionType.includes('login') && log.actionDetails?.success === false)
    .forEach(log => {
      if (!failedLoginsByIP[log.ipAddress]) {
        failedLoginsByIP[log.ipAddress] = [];
      }
      failedLoginsByIP[log.ipAddress].push(log);
    });

  // Detect IPs with multiple failed attempts
  Object.entries(failedLoginsByIP).forEach(([ip, failedLogs]) => {
    if (failedLogs.length >= 5) {
      activities.push({
        id: `failed-logins-${ip}-${Date.now()}`,
        type: 'multiple_failed_logins',
        severity: failedLogs.length >= 10 ? 'high' : 'medium',
        description: `Multiple failed login attempts (${failedLogs.length}) from IP ${ip}`,
        sourceIp: ip,
        targetUserId: failedLogs[0].userId || undefined,
        detectedAt: new Date(),
        status: 'active',
        riskScore: Math.min(failedLogs.length * 10, 100),
        actionType: failedLogs[0].actionType,
        userAgent: failedLogs[0].userAgent || undefined,
        additionalData: {
          attemptCount: failedLogs.length,
          timeSpan:
            new Date().getTime() - failedLogs[failedLogs.length - 1].actionTimestamp.getTime(),
        },
      });
    }
  });

  return activities;
};

/**
 * Detect unusual IP addresses (IPs that haven't been seen before)
 */
const detectUnusualIPAddresses = async (logs: AuditLog[]): Promise<SuspiciousActivity[]> => {
  const activities: SuspiciousActivity[] = [];
  const recentIPs = new Set(logs.map(log => log.ipAddress));

  // Get historical IPs (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const historicalLogs = await AuditLog.findAll({
    where: {
      actionTimestamp: {
        [Op.gte]: thirtyDaysAgo,
        [Op.lt]: new Date(Date.now() - 24 * 60 * 60 * 1000), // Exclude last 24 hours
      },
    },
    attributes: ['ipAddress'],
    group: ['ipAddress'],
  });

  const historicalIPs = new Set(historicalLogs.map(log => log.ipAddress));

  // Find new IPs
  recentIPs.forEach(ip => {
    if (!historicalIPs.has(ip)) {
      const ipLogs = logs.filter(log => log.ipAddress === ip);
      if (ipLogs.length > 0) {
        activities.push({
          id: `new-ip-${ip}-${Date.now()}`,
          type: 'unusual_ip_address',
          severity: 'medium',
          description: `New IP address detected: ${ip}`,
          sourceIp: ip,
          targetUserId: ipLogs[0].userId || undefined,
          detectedAt: new Date(),
          status: 'active',
          riskScore: 60,
          actionType: ipLogs[0].actionType,
          userAgent: ipLogs[0].userAgent || undefined,
          additionalData: {
            firstSeen: ipLogs[ipLogs.length - 1].actionTimestamp,
            actionCount: ipLogs.length,
          },
        });
      }
    }
  });

  return activities;
};

/**
 * Detect rapid successive actions from same user/IP
 */
const detectRapidSuccessiveActions = (logs: AuditLog[]): SuspiciousActivity[] => {
  const activities: SuspiciousActivity[] = [];
  const actionsByUser: { [key: string]: AuditLog[] } = {};

  // Group actions by user
  logs.forEach(log => {
    const key = log.userId || log.ipAddress;
    if (!actionsByUser[key]) {
      actionsByUser[key] = [];
    }
    actionsByUser[key].push(log);
  });

  // Check for rapid actions
  Object.entries(actionsByUser).forEach(([userKey, userLogs]) => {
    if (userLogs.length >= 20) {
      // 20+ actions in time window
      const sortedLogs = userLogs.sort(
        (a, b) => a.actionTimestamp.getTime() - b.actionTimestamp.getTime(),
      );

      // Check if actions are within a short time span
      const firstAction = sortedLogs[0];
      const lastAction = sortedLogs[sortedLogs.length - 1];
      const timeSpan = lastAction.actionTimestamp.getTime() - firstAction.actionTimestamp.getTime();

      if (timeSpan < 10 * 60 * 1000) {
        // Less than 10 minutes
        activities.push({
          id: `rapid-actions-${userKey}-${Date.now()}`,
          type: 'rapid_successive_actions',
          severity: 'high',
          description: `Rapid successive actions detected (${userLogs.length} actions in ${Math.round(timeSpan / 1000)} seconds)`,
          sourceIp: firstAction.ipAddress,
          targetUserId: firstAction.userId || undefined,
          detectedAt: new Date(),
          status: 'active',
          riskScore: 80,
          actionType: 'multiple_actions',
          userAgent: firstAction.userAgent || undefined,
          additionalData: {
            actionCount: userLogs.length,
            timeSpanMs: timeSpan,
            actionsPerMinute: (userLogs.length / (timeSpan / 60000)).toFixed(2),
          },
        });
      }
    }
  });

  return activities;
};

/**
 * Detect unusual time patterns (actions outside normal hours)
 */
const detectUnusualTimePatterns = (logs: AuditLog[]): SuspiciousActivity[] => {
  const activities: SuspiciousActivity[] = [];

  // Consider 11 PM to 6 AM as unusual hours
  const unusualHourLogs = logs.filter(log => {
    const hour = log.actionTimestamp.getHours();
    return hour >= 23 || hour <= 6;
  });

  if (unusualHourLogs.length >= 10) {
    const groupedByUser: { [key: string]: AuditLog[] } = {};

    unusualHourLogs.forEach(log => {
      const key = log.userId || log.ipAddress;
      if (!groupedByUser[key]) {
        groupedByUser[key] = [];
      }
      groupedByUser[key].push(log);
    });

    Object.entries(groupedByUser).forEach(([userKey, userLogs]) => {
      if (userLogs.length >= 5) {
        activities.push({
          id: `unusual-hours-${userKey}-${Date.now()}`,
          type: 'unusual_time_pattern',
          severity: 'medium',
          description: `Unusual activity detected during off-hours (${userLogs.length} actions between 11 PM - 6 AM)`,
          sourceIp: userLogs[0].ipAddress,
          targetUserId: userLogs[0].userId || undefined,
          detectedAt: new Date(),
          status: 'active',
          riskScore: 50,
          actionType: 'off_hours_activity',
          userAgent: userLogs[0].userAgent || undefined,
          additionalData: {
            actionCount: userLogs.length,
            timeRange: 'off_hours',
            hours: userLogs.map(log => log.actionTimestamp.getHours()),
          },
        });
      }
    });
  }

  return activities;
};

/**
 * Get suspicious activities with filtering and pagination
 */
export const getSuspiciousActivities = async (
  filters: SuspiciousActivityFilters = {},
  page: number = 1,
  limit: number = 50,
): Promise<{
  activities: SuspiciousActivity[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}> => {
  try {
    // Detect current suspicious activities
    const allActivities = await detectSuspiciousActivities();

    // Apply filters
    let filteredActivities = allActivities;

    if (filters.severity) {
      filteredActivities = filteredActivities.filter(
        activity => activity.severity === filters.severity,
      );
    }

    if (filters.status) {
      filteredActivities = filteredActivities.filter(
        activity => activity.status === filters.status,
      );
    }

    if (filters.type) {
      filteredActivities = filteredActivities.filter(activity => activity.type === filters.type);
    }

    if (filters.sourceIp) {
      filteredActivities = filteredActivities.filter(
        activity => activity.sourceIp === filters.sourceIp,
      );
    }

    if (filters.startDate || filters.endDate) {
      filteredActivities = filteredActivities.filter(activity => {
        const activityDate = activity.detectedAt;
        if (filters.startDate && activityDate < new Date(filters.startDate)) {
          return false;
        }
        if (filters.endDate && activityDate > new Date(filters.endDate)) {
          return false;
        }
        return true;
      });
    }

    // Sort by detection time (newest first) and risk score
    filteredActivities.sort((a, b) => {
      if (b.detectedAt.getTime() !== a.detectedAt.getTime()) {
        return b.detectedAt.getTime() - a.detectedAt.getTime();
      }
      return b.riskScore - a.riskScore;
    });

    // Apply pagination
    const total = filteredActivities.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const activities = filteredActivities.slice(offset, offset + limit);

    return {
      activities,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  } catch (error) {
    logger.error('Error getting suspicious activities:', error);
    return {
      activities: [],
      pagination: {
        total: 0,
        page,
        limit,
        totalPages: 0,
      },
    };
  }
};

/**
 * Mark suspicious activity as investigated
 */
export const markAsInvestigated = (activityId: string): boolean => {
  try {
    // In a real implementation, this would update a database record
    // For now, we'll just log the action
    logger.info(`Suspicious activity marked as investigated: ${activityId}`);
    return true;
  } catch (error) {
    logger.error('Error marking activity as investigated:', error);
    return false;
  }
};

/**
 * Mark suspicious activity as false positive
 */
export const markAsFalsePositive = (activityId: string): boolean => {
  try {
    // In a real implementation, this would update a database record
    // For now, we'll just log the action
    logger.info(`Suspicious activity marked as false positive: ${activityId}`);
    return true;
  } catch (error) {
    logger.error('Error marking activity as false positive:', error);
    return false;
  }
};
