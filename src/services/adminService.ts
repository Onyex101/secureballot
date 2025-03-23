import AdminUser from '../db/models/AdminUser';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import { Op } from 'sequelize';
import { UserRole } from '../types';

/**
 * Get users with filtering and pagination
 */
export const getUsers = async (
  role?: string,
  status?: string,
  page: number = 1,
  limit: number = 50,
) => {
  // Build filter conditions
  const whereConditions: any = {};

  if (role) {
    whereConditions.adminType = role;
  }

  if (status && status !== 'all') {
    whereConditions.isActive = status === 'active';
  }

  // Calculate pagination
  const offset = (page - 1) * limit;

  // Fetch users with pagination
  const { count, rows: users } = await AdminUser.findAndCountAll({
    where: whereConditions,
    limit,
    offset,
    attributes: [
      'id',
      'fullName',
      'email',
      'phoneNumber',
      'adminType',
      'isActive',
      'createdAt',
      'lastLogin',
    ],
    order: [['createdAt', 'DESC']],
  });

  // Calculate pagination metadata
  const totalPages = Math.ceil(count / limit);

  return {
    users,
    pagination: {
      total: count,
      page,
      limit,
      totalPages,
    },
  };
};

/**
 * Check if a user with the given email exists
 */
export const checkUserExists = async (email: string) => {
  const existingUser = await AdminUser.findOne({ where: { email } });
  return existingUser !== null;
};

/**
 * Create a new admin user
 */
export const createAdminUser = async (
  email: string,
  fullName: string,
  phoneNumber: string,
  password: string,
  role: UserRole,
  createdById: string,
) => {
  // Hash password
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  // Create new admin user
  const newUser = await AdminUser.create({
    id: uuidv4(),
    email,
    fullName,
    phoneNumber,
    passwordHash,
    adminType: role,
    isActive: true,
    createdBy: createdById,
    password, // This is required by the interface but not stored
  });

  // Return user data without sensitive information
  return {
    id: newUser.id,
    email: newUser.email,
    fullName: newUser.fullName,
    phoneNumber: newUser.phoneNumber,
    role: newUser.adminType,
    isActive: newUser.isActive,
    createdAt: newUser.createdAt,
  };
};
