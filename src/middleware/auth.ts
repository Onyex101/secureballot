/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from './errorHandler';
import AdminUser from '../db/models/AdminUser';
import Voter from '../db/models/Voter';
import { config } from '../config/index';
import { logger } from '../config/logger';

// Enhanced Request interface to support both admin and voter users
export interface AuthRequest extends Request {
  user?: any;
  userType?: 'admin' | 'voter';
  userId?: string;
  role?: string;
}

interface JwtPayload extends jwt.JwtPayload {
  id: string;
  role: string;
}

/**
 * Middleware to authenticate JWT token for both admin and voter users
 * @route All protected routes
 */
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new ApiError(401, 'No authorization header', 'AUTH_HEADER_MISSING');
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new ApiError(401, 'No token provided', 'TOKEN_MISSING');
    }

    try {
      // Use JWT_SECRET from config with proper fallback
      const secret = config.jwt.secret || process.env.JWT_SECRET;
      if (!secret) {
        logger.error('JWT secret is not defined');
        throw new ApiError(500, 'Internal server error', 'SERVER_ERROR');
      }

      const decoded = jwt.verify(token, secret) as JwtPayload;

      // Extract user ID and role from token
      const userId = decoded.id;
      const role = decoded.role;

      if (!userId || !role) {
        throw new ApiError(401, 'Invalid token payload', 'INVALID_TOKEN_PAYLOAD');
      }

      // Store user ID and role in request for easier access
      req.userId = userId;
      req.role = role;

      // Handle different user types based on role
      if (role === 'admin') {
        const admin = await AdminUser.findByPk(userId, {
          include: ['roles', 'permissions'],
        });

        if (!admin) {
          throw new ApiError(401, 'Admin user not found', 'USER_NOT_FOUND');
        }

        if (!admin.isActive) {
          throw new ApiError(403, 'Account is inactive', 'ACCOUNT_INACTIVE');
        }

        req.user = admin;
        req.userType = 'admin';
      } else if (role === 'voter') {
        const voter = await Voter.findByPk(userId);

        if (!voter) {
          throw new ApiError(401, 'Voter not found', 'USER_NOT_FOUND');
        }

        if (!voter.isActive) {
          throw new ApiError(403, 'Account is inactive', 'ACCOUNT_INACTIVE');
        }

        req.user = voter;
        req.userType = 'voter';
      } else {
        throw new ApiError(403, 'Invalid user role', 'INVALID_ROLE');
      }

      next();
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new ApiError(401, 'Invalid or expired token', 'INVALID_TOKEN');
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to ensure user is an admin
 * @route Admin-only routes
 */
export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    if (!req.user || req.userType !== 'admin') {
      throw new ApiError(403, 'Admin access required', 'ADMIN_REQUIRED');
    }
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to ensure user is a voter
 * @route Voter-only routes
 */
export const requireVoter = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    if (!req.user || req.userType !== 'voter') {
      throw new ApiError(403, 'Voter access required', 'VOTER_REQUIRED');
    }
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to check specific permissions for admin users
 * @param requiredPermission Required permission string
 * @route Admin routes with specific permission requirements
 */
export const hasPermission = (requiredPermission: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user || req.userType !== 'admin') {
        throw new ApiError(403, 'Admin access required', 'ADMIN_REQUIRED');
      }

      // Check if user is a system administrator (always has all permissions)
      if (req.user.adminType === 'SystemAdministrator') {
        return next();
      }

      // Check specific permission
      const hasRequiredPermission = req.user.permissions?.some(
        (permission: any) => permission.permissionName === requiredPermission,
      );

      if (!hasRequiredPermission) {
        throw new ApiError(403, `Required permission: ${requiredPermission}`, 'PERMISSION_DENIED');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to check if MFA is enabled
 * @route Routes requiring MFA
 */
export const requireMfa = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'User not authenticated', 'AUTHENTICATION_REQUIRED');
    }

    if (!req.user.mfaEnabled) {
      throw new ApiError(403, 'MFA not enabled', 'MFA_NOT_ENABLED');
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to check device verification for mobile routes
 * @route Mobile routes requiring device verification
 */
export const requireDeviceVerification = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'User not authenticated', 'AUTHENTICATION_REQUIRED');
    }

    const deviceId = req.headers['x-device-id'] as string;

    if (!deviceId) {
      throw new ApiError(400, 'Device ID required', 'DEVICE_ID_REQUIRED');
    }

    // TODO: Implement device verification logic
    // This should check if the deviceId is registered for this user
    // For now, we'll just pass through

    next();
  } catch (error) {
    next(error);
  }
};
