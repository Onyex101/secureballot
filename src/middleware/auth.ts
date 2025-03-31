/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from './errorHandler';
import AdminUser from '../db/models/AdminUser';
import { config } from '../config/index';

// Define custom Request interface with user
export interface AuthRequest extends Request {
  user?: AdminUser;
}

/**
 * Middleware to authenticate JWT token
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
      const decoded = jwt.verify(token, config.jwt.secret) as jwt.JwtPayload;
      const user = await AdminUser.findByPk(decoded.id);

      if (!user) {
        throw new ApiError(401, 'User not found', 'USER_NOT_FOUND');
      }

      req.user = user;
      next();
    } catch (error) {
      throw new ApiError(401, 'Invalid token', 'INVALID_TOKEN');
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to authorize based on user roles
 * @param roles Allowed roles
 */
export const authorize = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new ApiError(401, 'No token provided');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret) as jwt.JwtPayload;
    const user = await AdminUser.findByPk(decoded.id, {
      include: ['roles', 'permissions'],
    });

    if (!user) {
      throw new ApiError(401, 'User not found');
    }

    req.user = user;
    next();
  } catch (error) {
    next(new ApiError(401, 'Invalid token'));
  }
};

/**
 * Middleware to check specific permissions
 * @param requiredPermissions Required permissions
 */
export const hasPermission = (requiredPermission: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ApiError(401, 'User not authenticated');
      }

      const hasPermission = req.user.permissions?.some(
        permission => permission.permissionName === requiredPermission,
      );

      if (!hasPermission) {
        throw new ApiError(403, 'Access denied');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

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

export const requireDeviceVerification = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'User not authenticated', 'AUTHENTICATION_REQUIRED');
    }

    const deviceId = req.headers['x-device-id'];

    if (!deviceId) {
      throw new ApiError(400, 'Device ID required', 'DEVICE_ID_REQUIRED');
    }

    // TODO: Implement device verification logic
    next();
  } catch (error) {
    next(error);
  }
};
