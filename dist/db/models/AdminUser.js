"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable no-return-await */
const sequelize_1 = require("sequelize");
const bcrypt_1 = __importDefault(require("bcrypt"));
const auth_1 = require("../../types/auth");
const encryptionService_1 = require("../../services/encryptionService");
// Remove @Table decorator
class AdminUser extends sequelize_1.Model {
    // Associations (defined in associate method)
    roles;
    permissions;
    auditLogs; // Correct property name
    assignedPollingUnits;
    // public observerReports?: ObserverReport[];
    // public reviewedReports?: ObserverReport[];
    createdElections;
    creator;
    createdUsers;
    // Virtual fields
    password;
    nin;
    // Getter method to decrypt NIN when accessed
    get decryptedNin() {
        if (!this.ninEncrypted)
            return null;
        try {
            return (0, encryptionService_1.decryptIdentity)(this.ninEncrypted);
        }
        catch (error) {
            return null;
        }
    }
    // Password validation and hashing (keep static hash method if used elsewhere)
    static hashPassword(password) {
        const saltRounds = 10;
        return bcrypt_1.default.hash(password, saltRounds);
    }
    validatePassword(password) {
        return bcrypt_1.default.compare(password, this.passwordHash);
    }
    // Re-add static associate method
    static associate(models) {
        AdminUser.hasMany(models.AdminRole, {
            foreignKey: 'adminId',
            sourceKey: 'id',
            as: 'roles',
        });
        AdminUser.hasMany(models.AdminPermission, {
            foreignKey: 'adminId',
            sourceKey: 'id',
            as: 'permissions',
        });
        AdminUser.hasMany(models.AuditLog, {
            // Correct model name
            foreignKey: 'adminId',
            sourceKey: 'id',
            as: 'auditLogs', // Correct alias
        });
        AdminUser.hasMany(models.PollingUnit, {
            foreignKey: 'assignedOfficer',
            sourceKey: 'id',
            as: 'assignedPollingUnits',
        });
        AdminUser.hasMany(models.ObserverReport, {
            foreignKey: 'observer_id',
            as: 'observerReports',
        });
        AdminUser.hasMany(models.ObserverReport, {
            foreignKey: 'reviewed_by',
            as: 'reviewedReports',
        });
        AdminUser.hasMany(models.Election, {
            foreignKey: 'createdBy',
            sourceKey: 'id',
            as: 'createdElections',
        });
        AdminUser.belongsTo(models.AdminUser, {
            foreignKey: 'createdBy',
            targetKey: 'id',
            as: 'creator',
        });
        AdminUser.hasMany(models.AdminUser, {
            foreignKey: 'createdBy',
            sourceKey: 'id',
            as: 'createdUsers',
        });
    }
    // Re-add static initialize method
    static initialize(sequelize) {
        return AdminUser.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
            },
            fullName: {
                type: sequelize_1.DataTypes.STRING(100),
                allowNull: false,
                field: 'full_name',
                validate: {
                    notEmpty: true,
                },
            },
            email: {
                type: sequelize_1.DataTypes.STRING(100),
                allowNull: false,
                unique: true,
                validate: {
                    isEmail: true,
                    notEmpty: true,
                },
            },
            phoneNumber: {
                type: sequelize_1.DataTypes.STRING(15),
                allowNull: false,
                field: 'phone_number',
                unique: true,
                validate: {
                    is: /^\+?[0-9]{10,15}$/,
                    notEmpty: true,
                },
            },
            passwordHash: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: false,
                field: 'password_hash',
            },
            adminType: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: false,
                field: 'admin_type',
                validate: {
                    isIn: [Object.values(auth_1.UserRole)], // Ensure UserRole is accessible
                },
            },
            isActive: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                field: 'is_active',
                defaultValue: true,
            },
            createdAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                field: 'created_at',
                defaultValue: sequelize_1.DataTypes.NOW,
            },
            updatedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                field: 'updated_at',
                defaultValue: sequelize_1.DataTypes.NOW,
            },
            lastLogin: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
                field: 'last_login',
            },
            createdBy: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                field: 'created_by',
                references: {
                    model: 'admin_users',
                    key: 'id',
                },
                onDelete: 'SET NULL',
                onUpdate: 'CASCADE',
            },
            recoveryToken: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: true,
                field: 'recovery_token',
            },
            recoveryTokenExpiry: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
                field: 'recovery_token_expiry',
            },
            mfaSecret: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: true,
                field: 'mfa_secret',
            },
            mfaEnabled: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                field: 'mfa_enabled',
                defaultValue: false,
            },
            mfaBackupCodes: {
                type: sequelize_1.DataTypes.ARRAY(sequelize_1.DataTypes.STRING),
                allowNull: true,
                field: 'mfa_backup_codes',
            },
            // New authentication fields
            ninEncrypted: {
                field: 'nin_encrypted',
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: true,
            },
        }, {
            sequelize,
            modelName: 'AdminUser',
            tableName: 'admin_users',
            timestamps: true,
            underscored: true,
            hooks: {
                beforeCreate: async (user) => {
                    if (user.password) {
                        user.passwordHash = await AdminUser.hashPassword(user.password);
                        user.password = undefined;
                    }
                    // Encrypt NIN before creation
                    if (user.nin) {
                        user.ninEncrypted = (0, encryptionService_1.encryptIdentity)(user.nin);
                        delete user.nin; // Remove virtual field after encryption
                    }
                },
                beforeUpdate: async (user) => {
                    // Only hash if password is provided and changed
                    if (user.password && user.changed('passwordHash') === false) {
                        user.passwordHash = await AdminUser.hashPassword(user.password);
                        user.password = undefined;
                    }
                    // Encrypt NIN on update if provided
                    if (user.nin) {
                        user.ninEncrypted = (0, encryptionService_1.encryptIdentity)(user.nin);
                        delete user.nin; // Remove virtual field after encryption
                    }
                },
            },
        });
    }
}
exports.default = AdminUser;
//# sourceMappingURL=AdminUser.js.map