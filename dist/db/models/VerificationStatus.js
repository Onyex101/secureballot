"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class VerificationStatus extends sequelize_1.Model {
    // Model associations
    static associate(models) {
        VerificationStatus.belongsTo(models.Voter, {
            foreignKey: 'user_id',
            as: 'voter',
        });
    }
    static initialize(sequelize) {
        return VerificationStatus.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
            },
            userId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                field: 'user_id',
                unique: true,
                references: {
                    model: 'voters',
                    key: 'id',
                },
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE',
            },
            isPhoneVerified: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
                field: 'is_phone_verified',
            },
            isEmailVerified: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
                field: 'is_email_verified',
            },
            isIdentityVerified: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
                field: 'is_identity_verified',
            },
            isAddressVerified: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
                field: 'is_address_verified',
            },
            isBiometricVerified: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
                field: 'is_biometric_verified',
            },
            verificationLevel: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                field: 'verification_level',
            },
            lastVerifiedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
                field: 'last_verified_at',
            },
            isVerified: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
                field: 'is_verified',
            },
            state: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: false,
                field: 'state',
            },
            verifiedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
                field: 'verified_at',
            },
            verificationMethod: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: false,
                field: 'verification_method',
            },
            verificationData: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: false,
                field: 'verification_data',
            },
            createdAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                defaultValue: sequelize_1.DataTypes.NOW,
                field: 'created_at',
            },
            updatedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                defaultValue: sequelize_1.DataTypes.NOW,
                field: 'updated_at',
            },
        }, {
            sequelize,
            modelName: 'VerificationStatus',
            tableName: 'verification_statuses',
            underscored: false,
            timestamps: true,
            indexes: [{ unique: true, fields: ['user_id'] }],
        });
    }
}
// Timestamps
VerificationStatus.createdAt = 'createdAt';
VerificationStatus.updatedAt = 'updatedAt';
exports.default = VerificationStatus;
//# sourceMappingURL=VerificationStatus.js.map