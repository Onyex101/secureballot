import { RateLimitRequestHandler } from 'express-rate-limit';
export declare const defaultLimiter: RateLimitRequestHandler;
export declare const authLimiter: RateLimitRequestHandler;
export declare const sensitiveOpLimiter: RateLimitRequestHandler;
export declare const ussdLimiter: RateLimitRequestHandler;
export declare const adminLimiter: RateLimitRequestHandler;
export declare const createRateLimiter: (windowMs: number, max: number, errorCode: string, errorMessage: string) => RateLimitRequestHandler;
