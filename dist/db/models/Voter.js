"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const bcrypt_1 = __importDefault(require("bcrypt"));
class Voter extends sequelize_1.Model {
    validatePassword(password) {
        return bcrypt_1.default.compare(password, this.passwordHash);
    }
    static associate(models) {
        Voter.hasOne(models.VerificationStatus, {
            foreignKey: 'user_id',
            as: 'verificationStatus',
        });
        Voter.belongsTo(models.PollingUnit, {
            foreignKey: 'polling_unit_code',
            targetKey: 'pollingUnitCode',
            as: 'pollingUnit',
        });
        Voter.hasMany(models.Vote, {
            foreignKey: 'user_id',
            sourceKey: 'id',
            as: 'votes',
        });
        Voter.hasMany(models.AuditLog, {
            foreignKey: 'user_id',
            sourceKey: 'id',
            as: 'auditLogs',
        });
        Voter.hasMany(models.FailedAttempt, {
            foreignKey: 'user_id',
            sourceKey: 'id',
            as: 'failedAttempts',
        });
        Voter.hasMany(models.UssdSession, {
            foreignKey: 'user_id',
            sourceKey: 'id',
            as: 'ussdSessions',
        });
    }
    static initialize(sequelize) {
        return Voter.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
            },
            nin: {
                type: sequelize_1.DataTypes.STRING(11),
                allowNull: false,
                unique: true,
                validate: {
                    len: [11, 11],
                    notEmpty: true,
                },
            },
            vin: {
                type: sequelize_1.DataTypes.STRING(19),
                allowNull: false,
                unique: true,
                validate: {
                    len: [19, 19],
                    notEmpty: true,
                },
            },
            phoneNumber: {
                field: 'phone_number',
                type: sequelize_1.DataTypes.STRING(15),
                allowNull: false,
                validate: {
                    is: /^\+?[0-9]{10,15}$/,
                    notEmpty: true,
                },
            },
            dateOfBirth: {
                field: 'date_of_birth',
                type: sequelize_1.DataTypes.DATEONLY,
                allowNull: false,
            },
            fullName: {
                field: 'full_name',
                type: sequelize_1.DataTypes.STRING(100),
                allowNull: false,
                validate: {
                    notEmpty: true,
                },
            },
            pollingUnitCode: {
                field: 'polling_unit_code',
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: false,
                validate: {
                    notEmpty: true,
                },
            },
            state: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: false,
                validate: {
                    notEmpty: true,
                },
            },
            gender: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: false,
                defaultValue: 'male',
                validate: {
                    isIn: [['male', 'female']],
                },
            },
            lga: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: false,
                validate: {
                    notEmpty: true,
                },
            },
            ward: {
                type: sequelize_1.DataTypes.STRING(100),
                allowNull: false,
                validate: {
                    notEmpty: true,
                },
            },
            passwordHash: {
                field: 'password_hash',
                type: sequelize_1.DataTypes.STRING,
                allowNull: false,
                defaultValue: '', // Temporary default, will be overridden by hook
            },
            recoveryToken: {
                field: 'recovery_token',
                type: sequelize_1.DataTypes.STRING,
                allowNull: true,
            },
            recoveryTokenExpiry: {
                field: 'recovery_token_expiry',
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            isActive: {
                field: 'is_active',
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
            lastLogin: {
                field: 'last_login',
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            createdAt: {
                field: 'created_at',
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                defaultValue: sequelize_1.DataTypes.NOW,
            },
            updatedAt: {
                field: 'updated_at',
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                defaultValue: sequelize_1.DataTypes.NOW,
            },
            mfaSecret: {
                field: 'mfa_secret',
                type: sequelize_1.DataTypes.STRING,
                allowNull: true,
            },
            mfaEnabled: {
                field: 'mfa_enabled',
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            mfaBackupCodes: {
                field: 'mfa_backup_codes',
                type: sequelize_1.DataTypes.ARRAY(sequelize_1.DataTypes.STRING),
                allowNull: true,
            },
            publicKey: {
                field: 'public_key',
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            password: {
                type: sequelize_1.DataTypes.VIRTUAL,
                allowNull: true,
            },
        }, {
            sequelize,
            modelName: 'Voter',
            tableName: 'voters',
            underscored: true,
            timestamps: true,
            indexes: [
                { unique: true, fields: ['nin'] },
                { unique: true, fields: ['vin'] },
                { fields: ['phone_number'] },
                { fields: ['polling_unit_code'] },
                { fields: ['state', 'lga', 'ward'] },
            ],
            hooks: {
                beforeCreate: async (voter) => {
                    // Ensure password is hashed before creation
                    if (voter.password) {
                        const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);
                        voter.passwordHash = await bcrypt_1.default.hash(voter.password, saltRounds);
                        delete voter.password;
                    }
                },
                beforeUpdate: async (voter) => {
                    // Hash password on update if provided
                    if (voter.password && voter.changed('passwordHash') === false) {
                        const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);
                        voter.passwordHash = await bcrypt_1.default.hash(voter.password, saltRounds);
                        delete voter.password;
                    }
                },
            },
        });
    }
}
Voter.createdAt = 'createdAt';
Voter.updatedAt = 'updatedAt';
exports.default = Voter;
//# sourceMappingURL=Voter.js.map