import { Response, NextFunction } from 'express';
import * as adminService from '../../services/adminService';
import * as auditService from '../../services/auditService';
import { UserRole } from '../../types';
import { logger } from '../../config/logger';
import { ApiError } from '../../middleware/errorHandler';
import { AuditActionType } from '../../db/models/AuditLog';
import { AuthRequest } from '../../middleware/auth';

/**
 * List all system users with pagination and filtering
 */
export const listUsers = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { role, status, page = 1, limit = 50 } = req.query;

    // Get users from service
    const result = await adminService.getUsers(
      role as string,
      status as string,
      Number(page),
      Number(limit),
    );

    // Log the action using enum
    await auditService.createAuditLog(
      req.user?.id || 'unknown',
      AuditActionType.ADMIN_USER_LIST_VIEW,
      req.ip || '',
      req.headers['user-agent'] || '',
      { query: req.query, success: true },
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    // Log failure (optional, as global handler will log too)
    // logger.error('Error fetching admin users:', error);
    await auditService
      .createAuditLog(
        req.user?.id || 'unknown',
        AuditActionType.ADMIN_USER_LIST_VIEW,
        req.ip || '',
        req.headers['user-agent'] || '',
        { query: req.query, success: false, error: (error as Error).message },
      )
      .catch(logErr => logger.error('Failed to log user list view error', logErr));
    next(error);
  }
};

/**
 * Create a new admin user
 */
export const createUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email, fullName, phoneNumber, password, role } = req.body;
    const creatorUserId = req.user?.id;

    if (!creatorUserId) {
      throw new ApiError(401, 'Authentication required to create user', 'AUTH_REQUIRED');
    }

    // Check if user with email already exists
    const userExists = await adminService.checkUserExists(email);
    if (userExists) {
      // Throw ApiError instead of returning directly
      throw new ApiError(
        409,
        'User with this email already exists',
        'USER_EXISTS',
        undefined,
        true,
      );
    }

    // Create new admin user
    const newUser = await adminService.createAdminUser(
      email,
      fullName,
      phoneNumber,
      password,
      role as UserRole,
      creatorUserId,
    );

    // Log the action using enum
    await auditService.createAuditLog(
      creatorUserId,
      AuditActionType.ADMIN_USER_CREATE,
      req.ip || '',
      req.headers['user-agent'] || '',
      {
        success: true,
        createdUserId: newUser.id,
        role: newUser.role,
      },
    );

    // Return success
    res.status(201).json({
      success: true,
      message: 'Admin user created successfully',
      data: {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.fullName,
        role: newUser.role,
      },
    });
  } catch (error) {
    // Log failure (optional, as global handler will log too)
    // logger.error('Error creating admin user:', error);
    await auditService
      .createAuditLog(
        req.user?.id || 'unknown',
        AuditActionType.ADMIN_USER_CREATE,
        req.ip || '',
        req.headers['user-agent'] || '',
        {
          success: false,
          email: req.body.email,
          role: req.body.role,
          error: (error as Error).message,
        },
      )
      .catch(logErr => logger.error('Failed to log user creation error', logErr));
    next(error);
  }
};
