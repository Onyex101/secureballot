"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const encryptionService_1 = require("../../services/encryptionService");
class Voter extends sequelize_1.Model {
    static createdAt = 'createdAt';
    static updatedAt = 'updatedAt';
    // Virtual properties for input (these don't shadow database fields)
    nin;
    vin;
    // Getter methods to decrypt values when accessed
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
    get decryptedVin() {
        if (!this.vinEncrypted)
            return null;
        try {
            return (0, encryptionService_1.decryptIdentity)(this.vinEncrypted);
        }
        catch (error) {
            return null;
        }
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
            ninEncrypted: {
                field: 'nin_encrypted',
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: true,
            },
            vinEncrypted: {
                field: 'vin_encrypted',
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: true,
            },
            email: {
                type: sequelize_1.DataTypes.STRING(100),
                allowNull: true,
                validate: {
                    isEmail: true,
                },
            },
            otpCode: {
                field: 'otp_code',
                type: sequelize_1.DataTypes.STRING(6),
                allowNull: true,
            },
            otpExpiresAt: {
                field: 'otp_expires_at',
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            otpVerified: {
                field: 'otp_verified',
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            // Virtual fields for temporary nin and vin values
            nin: {
                type: sequelize_1.DataTypes.VIRTUAL,
                allowNull: true,
            },
            vin: {
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
                { unique: true, fields: ['nin_encrypted'] },
                { unique: true, fields: ['vin_encrypted'] },
                { fields: ['phone_number'] },
                { fields: ['polling_unit_code'] },
                { fields: ['state', 'lga', 'ward'] },
            ],
            hooks: {
                beforeCreate: (voter) => {
                    // Encrypt nin and vin before creation
                    if (voter.nin) {
                        voter.ninEncrypted = (0, encryptionService_1.encryptIdentity)(voter.nin);
                        delete voter.nin; // Remove virtual field after encryption
                    }
                    if (voter.vin) {
                        voter.vinEncrypted = (0, encryptionService_1.encryptIdentity)(voter.vin);
                        delete voter.vin; // Remove virtual field after encryption
                    }
                },
                beforeUpdate: (voter) => {
                    // Encrypt nin and vin on update if they are provided
                    if (voter.nin) {
                        voter.ninEncrypted = (0, encryptionService_1.encryptIdentity)(voter.nin);
                        delete voter.nin; // Remove virtual field after encryption
                    }
                    if (voter.vin) {
                        voter.vinEncrypted = (0, encryptionService_1.encryptIdentity)(voter.vin);
                        delete voter.vin; // Remove virtual field after encryption
                    }
                },
                afterFind: (result) => {
                    // Decrypt nin and vin after finding voter(s)
                    if (!result)
                        return;
                    const voters = Array.isArray(result) ? result : [result];
                    voters.forEach((voter) => {
                        if (voter.ninEncrypted) {
                            try {
                                voter.nin = (0, encryptionService_1.decryptIdentity)(voter.ninEncrypted);
                            }
                            catch (error) {
                                voter.nin = undefined;
                            }
                        }
                        if (voter.vinEncrypted) {
                            try {
                                voter.vin = (0, encryptionService_1.decryptIdentity)(voter.vinEncrypted);
                            }
                            catch (error) {
                                voter.vin = undefined;
                            }
                        }
                    });
                },
            },
        });
    }
}
exports.default = Voter;
//# sourceMappingURL=Voter.js.map