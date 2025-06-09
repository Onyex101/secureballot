import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { UserRole, Permission } from '../types';
export declare const rolePermissions: Record<string, string[]>;
/**
 * Middleware to require a minimum role level or one of the specified roles
 * @param roles The minimum role required or an array of acceptable roles
 */
export declare const requireRole: (roles: UserRole | UserRole[]) => (req: AuthRequest, res: Response, next: NextFunction) => void;
/**
 * Middleware to require specific permissions
 * @param requiredPermissions The permissions required to access the resource
 */
export declare const requirePermission: (requiredPermissions: Permission | Permission[]) => (req: AuthRequest, res: Response, next: NextFunction) => void;
/**
 * Middleware to require regional access
 * @param regionParam The request parameter containing the region ID
 */
export declare const requireRegionalAccess: (regionParam?: string) => (req: AuthRequest, res: Response, next: NextFunction) => void;
/**
 * Middleware to log access attempts
 */
export declare const logAccess: (req: AuthRequest, res: Response, next: NextFunction) => void;
