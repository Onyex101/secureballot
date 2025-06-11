"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdminProfile = exports.createAdminUser = exports.checkUserExists = exports.getUsers = void 0;
const AdminUser_1 = __importDefault(require("../db/models/AdminUser"));
const uuid_1 = require("uuid");
const bcrypt_1 = __importDefault(require("bcrypt"));
/**
 * Get users with filtering and pagination
 */
const getUsers = async (role, status, page = 1, limit = 50) => {
    // Build filter conditions
    const whereConditions = {};
    if (role) {
        whereConditions.adminType = role;
    }
    if (status && status !== 'all') {
        whereConditions.isActive = status === 'active';
    }
    // Calculate pagination
    const offset = (page - 1) * limit;
    // Fetch users with pagination
    const { count, rows: users } = await AdminUser_1.default.findAndCountAll({
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
exports.getUsers = getUsers;
/**
 * Check if a user with the given email exists
 */
const checkUserExists = async (email) => {
    const existingUser = await AdminUser_1.default.findOne({ where: { email } });
    return existingUser !== null;
};
exports.checkUserExists = checkUserExists;
/**
 * Create a new admin user
 */
const createAdminUser = async (email, fullName, phoneNumber, password, role, createdById) => {
    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt_1.default.hash(password, saltRounds);
    // Create new admin user
    const newUser = await AdminUser_1.default.create({
        id: (0, uuid_1.v4)(),
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
exports.createAdminUser = createAdminUser;
/**
 * Get admin user profile by ID
 */
const getAdminProfile = async (userId) => {
    const user = await AdminUser_1.default.findByPk(userId, {
        attributes: [
            'id',
            'fullName',
            'email',
            'phoneNumber',
            'adminType',
            'isActive',
            'createdAt',
            'updatedAt',
            'lastLogin',
            'mfaEnabled',
            'createdBy',
        ],
        include: [
            {
                model: AdminUser_1.default,
                as: 'creator',
                attributes: ['id', 'fullName', 'email'],
            },
        ],
    });
    if (!user) {
        throw new Error('Admin user not found');
    }
    return {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        adminType: user.adminType,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLogin: user.lastLogin,
        mfaEnabled: user.mfaEnabled,
        creator: user.creator
            ? {
                id: user.creator.id,
                fullName: user.creator.fullName,
                email: user.creator.email,
            }
            : null,
    };
};
exports.getAdminProfile = getAdminProfile;
//# sourceMappingURL=adminService.js.map