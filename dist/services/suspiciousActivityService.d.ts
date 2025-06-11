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
export declare const detectSuspiciousActivities: (timeWindow?: number) => Promise<SuspiciousActivity[]>;
/**
 * Get suspicious activities with filtering and pagination
 */
export declare const getSuspiciousActivities: (filters?: SuspiciousActivityFilters, page?: number, limit?: number) => Promise<{
    activities: SuspiciousActivity[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}>;
/**
 * Mark suspicious activity as investigated
 */
export declare const markAsInvestigated: (activityId: string) => boolean;
/**
 * Mark suspicious activity as false positive
 */
export declare const markAsFalsePositive: (activityId: string) => boolean;
