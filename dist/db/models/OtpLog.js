"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OtpStatus = void 0;
const sequelize_1 = require("sequelize");
var OtpStatus;
(function (OtpStatus) {
    OtpStatus["SENT"] = "sent";
    OtpStatus["VERIFIED"] = "verified";
    OtpStatus["EXPIRED"] = "expired";
    OtpStatus["FAILED"] = "failed";
})(OtpStatus = exports.OtpStatus || (exports.OtpStatus = {}));
class OtpLog extends sequelize_1.Model {
    static associate(models) {
        OtpLog.belongsTo(models.Voter, {
            foreignKey: 'user_id',
            as: 'voter',
        });
    }
    static initialize(sequelize) {
        return OtpLog.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
            },
            userId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                field: 'user_id',
                references: {
                    model: 'voters',
                    key: 'id',
                },
            },
            otpCode: {
                type: sequelize_1.DataTypes.STRING(6),
                allowNull: false,
                field: 'otp_code',
            },
            email: {
                type: sequelize_1.DataTypes.STRING(100),
                allowNull: false,
                validate: {
                    isEmail: true,
                },
            },
            ipAddress: {
                type: sequelize_1.DataTypes.INET,
                allowNull: true,
                field: 'ip_address',
            },
            userAgent: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
                field: 'user_agent',
            },
            status: {
                type: sequelize_1.DataTypes.ENUM(...Object.values(OtpStatus)),
                allowNull: false,
                defaultValue: OtpStatus.SENT,
            },
            attempts: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            expiresAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                field: 'expires_at',
            },
            verifiedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
                field: 'verified_at',
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
            tableName: 'otp_logs',
            timestamps: true,
            underscored: true,
            indexes: [
                {
                    fields: ['user_id'],
                    name: 'idx_otp_logs_user_id',
                },
                {
                    fields: ['status'],
                    name: 'idx_otp_logs_status',
                },
                {
                    fields: ['created_at'],
                    name: 'idx_otp_logs_created_at',
                },
            ],
        });
    }
}
OtpLog.createdAt = 'createdAt';
OtpLog.updatedAt = 'updatedAt';
exports.default = OtpLog;
//# sourceMappingURL=OtpLog.js.map