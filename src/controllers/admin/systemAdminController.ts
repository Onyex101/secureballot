import { Request, Response } from 'express';
import { adminService, auditService } from '../../services';
import { UserRole } from '../../types';

/**
 * List all system users with pagination and filtering
 */
export const listUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { role, status, page = 1, limit = 50 } = req.query;
    
    // Get users from service
    const result = await adminService.getUsers(
      role as string,
      status as string,
      Number(page),
      Number(limit)
    );
    
    // Log the action
    await auditService.createAuditLog(
      (req as any).user.id,
      'user_list_view',
      req.ip || '',
      req.headers['user-agent'] || '',
      { query: req.query }
    );
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching admin users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin users',
      error: (error as Error).message
    });
  }
};

/**
 * Create a new admin user
 */
export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, fullName, phoneNumber, password, role } = req.body;
    
    // Check if user with email already exists
    const userExists = await adminService.checkUserExists(email);
    if (userExists) {
      res.status(409).json({
        success: false,
        message: 'User with this email already exists',
        code: 'USER_EXISTS'
      });
      return;
    }
    
    // Create new admin user
    const newUser = await adminService.createAdminUser(
      email,
      fullName,
      phoneNumber,
      password,
      role as UserRole,
      (req as any).user.id
    );
    
    // Log the action
    await auditService.createAuditLog(
      (req as any).user.id,
      'admin_user_creation',
      req.ip || '',
      req.headers['user-agent'] || '',
      { 
        createdUserId: newUser.id,
        role: newUser.role
      }
    );
    
    // Return success
    res.status(201).json({
      success: true,
      message: 'Admin user created successfully',
      data: newUser
    });
  } catch (error) {
    console.error('Error creating admin user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create admin user',
      error: (error as Error).message
    });
  }
};
