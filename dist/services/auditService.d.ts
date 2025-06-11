import AuditLog from '../db/models/AuditLog';
/**
 * Create an audit log entry
 * Includes fallback handling for foreign key constraint violations
 */
export declare const createAuditLog: (userId: string | null, actionType: string, ipAddress: string, userAgent: string, actionDetails?: any) => Promise<AuditLog>;
/**
 * Create an audit log entry for admin actions
 */
export declare const createAdminAuditLog: (adminId: string | null, actionType: string, ipAddress: string, userAgent: string, actionDetails?: any) => Promise<AuditLog>;
/**
 * Get audit logs with filtering and pagination
 */
export declare const getAuditLogs: (actionType?: string, startDate?: string, endDate?: string, userId?: string, page?: number, limit?: number) => Promise<{
    auditLogs: AuditLog[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}>;
/**
 * Get security logs with filtering and pagination
 */
export declare const getSecurityLogs: (severity?: string, startDate?: string, endDate?: string, page?: number, limit?: number) => Promise<{
    securityLogs: AuditLog[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}>;
