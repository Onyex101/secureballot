"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invalidateSecurityCache = exports.invalidateUserCache = exports.invalidateDashboardCache = exports.getOrSetCached = exports.getCacheStats = exports.clearCache = exports.deleteCached = exports.setCached = exports.getCached = exports.CACHE_KEYS = void 0;
const logger_1 = require("../config/logger");
class CacheService {
    cache = new Map();
    cleanupInterval;
    constructor() {
        // Clean up expired entries every 5 minutes
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, 5 * 60 * 1000);
    }
    /**
     * Get cached data if it exists and is not expired
     */
    get(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            return null;
        }
        const now = Date.now();
        if (now - entry.timestamp > entry.ttl) {
            // Entry has expired
            this.cache.delete(key);
            return null;
        }
        return entry.data;
    }
    /**
     * Set data in cache with TTL
     */
    set(key, data, ttlMinutes = 5) {
        const entry = {
            data,
            timestamp: Date.now(),
            ttl: ttlMinutes * 60 * 1000, // Convert minutes to milliseconds
        };
        this.cache.set(key, entry);
    }
    /**
     * Delete specific cache entry
     */
    delete(key) {
        return this.cache.delete(key);
    }
    /**
     * Clear all cache entries
     */
    clear() {
        this.cache.clear();
    }
    /**
     * Get cache statistics
     */
    getStats() {
        const now = Date.now();
        let expiredCount = 0;
        for (const [, entry] of this.cache) {
            if (now - entry.timestamp > entry.ttl) {
                expiredCount++;
            }
        }
        return {
            totalEntries: this.cache.size,
            expiredEntries: expiredCount,
            memoryUsage: `${Math.round(JSON.stringify(Array.from(this.cache.entries())).length / 1024)} KB`,
        };
    }
    /**
     * Clean up expired entries
     */
    cleanup() {
        const now = Date.now();
        let cleanedCount = 0;
        for (const [key, entry] of this.cache) {
            if (now - entry.timestamp > entry.ttl) {
                this.cache.delete(key);
                cleanedCount++;
            }
        }
        if (cleanedCount > 0) {
            logger_1.logger.debug(`Cache cleanup: removed ${cleanedCount} expired entries`);
        }
    }
    /**
     * Get or set cached data (convenience method)
     */
    async getOrSet(key, fetchFunction, ttlMinutes = 5) {
        // Try to get from cache first
        const cached = this.get(key);
        if (cached !== null) {
            return cached;
        }
        // If not in cache, fetch the data
        try {
            const data = await fetchFunction();
            this.set(key, data, ttlMinutes);
            return data;
        }
        catch (error) {
            logger_1.logger.error(`Error fetching data for cache key ${key}:`, error);
            throw error;
        }
    }
    /**
     * Invalidate cache entries by pattern
     */
    invalidatePattern(pattern) {
        let deletedCount = 0;
        const regex = new RegExp(pattern);
        for (const key of this.cache.keys()) {
            if (regex.test(key)) {
                this.cache.delete(key);
                deletedCount++;
            }
        }
        return deletedCount;
    }
    /**
     * Destroy the cache service and cleanup intervals
     */
    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        this.clear();
    }
}
// Create singleton instance
const cacheService = new CacheService();
// Cache key generators for common data types
exports.CACHE_KEYS = {
    DASHBOARD_STATS: 'dashboard:stats',
    REAL_TIME_VOTING_STATS: 'stats:realtime:voting',
    ADMIN_USERS: (page, limit) => `admin:users:${page}:${limit}`,
    POLLING_UNITS: (page, limit) => `polling:units:${page}:${limit}`,
    VOTER_COUNT: 'voters:count',
    PENDING_VERIFICATIONS: (page, limit) => `verifications:pending:${page}:${limit}`,
    SUSPICIOUS_ACTIVITIES: (page, limit) => `security:suspicious:${page}:${limit}`,
    AUDIT_LOGS: (page, limit) => `audit:logs:${page}:${limit}`,
};
// Export the singleton instance and utility functions
exports.default = cacheService;
// Convenience functions
const getCached = (key) => cacheService.get(key);
exports.getCached = getCached;
const setCached = (key, data, ttlMinutes = 5) => cacheService.set(key, data, ttlMinutes);
exports.setCached = setCached;
const deleteCached = (key) => cacheService.delete(key);
exports.deleteCached = deleteCached;
const clearCache = () => cacheService.clear();
exports.clearCache = clearCache;
const getCacheStats = () => cacheService.getStats();
exports.getCacheStats = getCacheStats;
const getOrSetCached = (key, fetchFunction, ttlMinutes = 5) => cacheService.getOrSet(key, fetchFunction, ttlMinutes);
exports.getOrSetCached = getOrSetCached;
// Cache invalidation helpers
const invalidateDashboardCache = () => {
    cacheService.invalidatePattern('^dashboard:');
    cacheService.invalidatePattern('^stats:');
};
exports.invalidateDashboardCache = invalidateDashboardCache;
const invalidateUserCache = () => {
    cacheService.invalidatePattern('^admin:users:');
    cacheService.invalidatePattern('^voters:');
};
exports.invalidateUserCache = invalidateUserCache;
const invalidateSecurityCache = () => {
    cacheService.invalidatePattern('^security:');
    cacheService.invalidatePattern('^audit:');
};
exports.invalidateSecurityCache = invalidateSecurityCache;
//# sourceMappingURL=cacheService.js.map