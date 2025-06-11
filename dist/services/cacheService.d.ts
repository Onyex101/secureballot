declare class CacheService {
    private cache;
    private cleanupInterval;
    constructor();
    /**
     * Get cached data if it exists and is not expired
     */
    get<T>(key: string): T | null;
    /**
     * Set data in cache with TTL
     */
    set<T>(key: string, data: T, ttlMinutes?: number): void;
    /**
     * Delete specific cache entry
     */
    delete(key: string): boolean;
    /**
     * Clear all cache entries
     */
    clear(): void;
    /**
     * Get cache statistics
     */
    getStats(): {
        totalEntries: number;
        expiredEntries: number;
        memoryUsage: string;
    };
    /**
     * Clean up expired entries
     */
    private cleanup;
    /**
     * Get or set cached data (convenience method)
     */
    getOrSet<T>(key: string, fetchFunction: () => Promise<T>, ttlMinutes?: number): Promise<T>;
    /**
     * Invalidate cache entries by pattern
     */
    invalidatePattern(pattern: string): number;
    /**
     * Destroy the cache service and cleanup intervals
     */
    destroy(): void;
}
declare const cacheService: CacheService;
export declare const CACHE_KEYS: {
    DASHBOARD_STATS: string;
    REAL_TIME_VOTING_STATS: string;
    ADMIN_USERS: (page: number, limit: number) => string;
    POLLING_UNITS: (page: number, limit: number) => string;
    VOTER_COUNT: string;
    PENDING_VERIFICATIONS: (page: number, limit: number) => string;
    SUSPICIOUS_ACTIVITIES: (page: number, limit: number) => string;
    AUDIT_LOGS: (page: number, limit: number) => string;
};
export default cacheService;
export declare const getCached: <T>(key: string) => T | null;
export declare const setCached: <T>(key: string, data: T, ttlMinutes?: number) => void;
export declare const deleteCached: (key: string) => boolean;
export declare const clearCache: () => void;
export declare const getCacheStats: () => {
    totalEntries: number;
    expiredEntries: number;
    memoryUsage: string;
};
export declare const getOrSetCached: <T>(key: string, fetchFunction: () => Promise<T>, ttlMinutes?: number) => Promise<T>;
export declare const invalidateDashboardCache: () => void;
export declare const invalidateUserCache: () => void;
export declare const invalidateSecurityCache: () => void;
