import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from './errorHandler';

// Define custom Request interface with user
export interface AuthRequest extends Request {
  user?: {
    id: string;
    role?: string;
    permissions?: string[];
    [key: string]: any;
  };
}

// Define role-based authorization types
type RoleType = string | string[] | undefined;

/**
 * Middleware to authenticate JWT token
 */
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const error: ApiError = new Error('No authentication token provided');
      error.statusCode = 401;
      error.code = 'AUTHENTICATION_REQUIRED';
      error.isOperational = true;
      throw error;
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'default-secret-key'
      ) as {
        id: string;
        role?: string;
        permissions?: string[];
        [key: string]: any;
      };

      // Set user in request
      req.user = decoded;
      next();
    } catch (error) {
      const err: ApiError = new Error('Invalid or expired token');
      err.statusCode = 401;
      err.code = 'INVALID_TOKEN';
      err.isOperational = true;
      throw err;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to authorize based on user roles
 * @param roles Allowed roles
 */
export const authorize = (roles: RoleType = undefined) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        const error: ApiError = new Error('User not authenticated');
        error.statusCode = 401;
        error.code = 'AUTHENTICATION_REQUIRED';
        error.isOperational = true;
        throw error;
      }

      // Allow access if no specific roles are required
      if (!roles) {
        return next();
      }

      // Convert roles to array for easier handling
      const allowedRoles = Array.isArray(roles) ? roles : [roles];

      // Check if user has required role
      if (req.user.role && allowedRoles.includes(req.user.role)) {
        return next();
      }

      // Deny access if user doesn't have required role
      const error: ApiError = new Error('Access denied: insufficient permissions');
      error.statusCode = 403;
      error.code = 'ACCESS_DENIED';
      error.isOperational = true;
      throw error;
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to check specific permissions
 * @param requiredPermissions Required permissions
 */
export const hasPermission = (requiredPermissions: string | string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        const error: ApiError = new Error('User not authenticated');
        error.statusCode = 401;
        error.code = 'AUTHENTICATION_REQUIRED';
        error.isOperational = true;
        throw error;
      }

      const permissions = Array.isArray(requiredPermissions)
        ? requiredPermissions
        : [requiredPermissions];

      // If no permissions are set on the user, deny access
      if (!req.user.permissions || !Array.isArray(req.user.permissions)) {
        const error: ApiError = new Error('Access denied: no permissions set');
        error.statusCode = 403;
        error.code = 'ACCESS_DENIED';
        error.isOperational = true;
        throw error;
      }

      // Check if user has all required permissions
      const hasAllPermissions = permissions.every((permission) =>
        req.user?.permissions?.includes(permission)
      );

      if (hasAllPermissions) {
        return next();
      }

      // Deny access if user doesn't have all required permissions
      const error: ApiError = new Error('Access denied: insufficient permissions');
      error.statusCode = 403;
      error.code = 'ACCESS_DENIED';
      error.isOperational = true;
      throw error;
    } catch (error) {
      next(error);
    }
  };
};