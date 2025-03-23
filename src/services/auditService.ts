import AuditLog from '../db/models/AuditLog';
import { Op } from 'sequelize';

/**
 * Create an audit log entry
 */
export const createAuditLog = async (
  userId: string,
  actionType: string,
  ipAddress: string,
  userAgent: string,
  actionDetails?: any,
) => {
  return await AuditLog.create({
    userId,
    actionType,
    ipAddress,
    userAgent,
    actionDetails,
  });
};

/**
 * Get audit logs with filtering and pagination
 */
export const getAuditLogs = async (
  actionType?: string,
  startDate?: string,
  endDate?: string,
  userId?: string,
  page: number = 1,
  limit: number = 50,
) => {
  // Build filter conditions
  const whereConditions: any = {};

  if (actionType) {
    whereConditions.actionType = actionType;
  }

  if (userId) {
    whereConditions.userId = userId;
  }

  // Date range filter
  if (startDate || endDate) {
    whereConditions.actionTimestamp = {};

    if (startDate) {
      whereConditions.actionTimestamp[Op.gte] = new Date(startDate);
    }

    if (endDate) {
      whereConditions.actionTimestamp[Op.lte] = new Date(endDate);
    }
  }

  // Calculate pagination
  const offset = (page - 1) * limit;

  // Fetch audit logs with pagination
  const { count, rows: auditLogs } = await AuditLog.findAndCountAll({
    where: whereConditions,
    limit,
    offset,
    order: [['actionTimestamp', 'DESC']],
  });

  // Calculate pagination metadata
  const totalPages = Math.ceil(count / limit);

  return {
    auditLogs,
    pagination: {
      total: count,
      page,
      limit,
      totalPages,
    },
  };
};

/**
 * Get security logs with filtering and pagination
 */
export const getSecurityLogs = async (
  severity?: string,
  startDate?: string,
  endDate?: string,
  page: number = 1,
  limit: number = 50,
) => {
  // Build filter conditions
  const whereConditions: any = {
    isSuspicious: true, // Only get suspicious logs
  };

  // Map severity to custom logic if needed
  if (severity) {
    // This is a simplified example - in a real app, you might have a severity field
    // or determine severity based on other factors
    switch (severity) {
      case 'critical':
        whereConditions.actionType = {
          [Op.in]: ['password_reset', 'mfa_verify'],
        };
        break;
      case 'high':
        whereConditions.actionType = {
          [Op.in]: ['login', 'vote_cast'],
        };
        break;
      case 'medium':
        whereConditions.actionType = {
          [Op.in]: ['verification', 'profile_update'],
        };
        break;
      case 'low':
        whereConditions.actionType = {
          [Op.in]: ['election_view', 'logout'],
        };
        break;
    }
  }

  // Date range filter
  if (startDate || endDate) {
    whereConditions.actionTimestamp = {};

    if (startDate) {
      whereConditions.actionTimestamp[Op.gte] = new Date(startDate);
    }

    if (endDate) {
      whereConditions.actionTimestamp[Op.lte] = new Date(endDate);
    }
  }

  // Calculate pagination
  const offset = (page - 1) * limit;

  // Fetch security logs with pagination
  const { count, rows: securityLogs } = await AuditLog.findAndCountAll({
    where: whereConditions,
    limit,
    offset,
    order: [['actionTimestamp', 'DESC']],
  });

  // Calculate pagination metadata
  const totalPages = Math.ceil(count / limit);

  return {
    securityLogs,
    pagination: {
      total: count,
      page,
      limit,
      totalPages,
    },
  };
};
