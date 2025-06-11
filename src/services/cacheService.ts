import { logger } from '../config/logger';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class CacheService {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(
      () => {
        this.cleanup();
      },
      5 * 60 * 1000,
    );
  }

  /**
   * Get cached data if it exists and is not expired
   */
  get<T>(key: string): T | null {
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
  set<T>(key: string, data: T, ttlMinutes: number = 5): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttlMinutes * 60 * 1000, // Convert minutes to milliseconds
    };

    this.cache.set(key, entry);
  }

  /**
   * Delete specific cache entry
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    totalEntries: number;
    expiredEntries: number;
    memoryUsage: string;
  } {
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
  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.debug(`Cache cleanup: removed ${cleanedCount} expired entries`);
    }
  }

  /**
   * Get or set cached data (convenience method)
   */
  async getOrSet<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    ttlMinutes: number = 5,
  ): Promise<T> {
    // Try to get from cache first
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // If not in cache, fetch the data
    try {
      const data = await fetchFunction();
      this.set(key, data, ttlMinutes);
      return data;
    } catch (error) {
      logger.error(`Error fetching data for cache key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Invalidate cache entries by pattern
   */
  invalidatePattern(pattern: string): number {
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
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

// Create singleton instance
const cacheService = new CacheService();

// Cache key generators for common data types
export const CACHE_KEYS = {
  DASHBOARD_STATS: 'dashboard:stats',
  REAL_TIME_VOTING_STATS: 'stats:realtime:voting',
  ADMIN_USERS: (page: number, limit: number) => `admin:users:${page}:${limit}`,
  POLLING_UNITS: (page: number, limit: number) => `polling:units:${page}:${limit}`,
  VOTER_COUNT: 'voters:count',
  PENDING_VERIFICATIONS: (page: number, limit: number) => `verifications:pending:${page}:${limit}`,
  SUSPICIOUS_ACTIVITIES: (page: number, limit: number) => `security:suspicious:${page}:${limit}`,
  AUDIT_LOGS: (page: number, limit: number) => `audit:logs:${page}:${limit}`,
};

// Export the singleton instance and utility functions
export default cacheService;

// Convenience functions
export const getCached = <T>(key: string): T | null => cacheService.get<T>(key);
export const setCached = <T>(key: string, data: T, ttlMinutes: number = 5): void =>
  cacheService.set(key, data, ttlMinutes);
export const deleteCached = (key: string): boolean => cacheService.delete(key);
export const clearCache = (): void => cacheService.clear();
export const getCacheStats = () => cacheService.getStats();
export const getOrSetCached = <T>(
  key: string,
  fetchFunction: () => Promise<T>,
  ttlMinutes: number = 5,
): Promise<T> => cacheService.getOrSet(key, fetchFunction, ttlMinutes);

// Cache invalidation helpers
export const invalidateDashboardCache = (): void => {
  cacheService.invalidatePattern('^dashboard:');
  cacheService.invalidatePattern('^stats:');
};

export const invalidateUserCache = (): void => {
  cacheService.invalidatePattern('^admin:users:');
  cacheService.invalidatePattern('^voters:');
};

export const invalidateSecurityCache = (): void => {
  cacheService.invalidatePattern('^security:');
  cacheService.invalidatePattern('^audit:');
};
