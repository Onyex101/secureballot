"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttemptType = void 0;
const sequelize_1 = require("sequelize");
// Attempt type enum
var AttemptType;
(function (AttemptType) {
    AttemptType["LOGIN"] = "login";
    AttemptType["PASSWORD_RESET"] = "password_reset";
    AttemptType["MFA"] = "mfa";
    AttemptType["USSD_AUTH"] = "ussd_auth";
    AttemptType["MOBILE_LOGIN"] = "mobile_login";
})(AttemptType = exports.AttemptType || (exports.AttemptType = {}));
class FailedAttempt extends sequelize_1.Model {
    id;
    userId;
    attemptType;
    ipAddress;
    userAgent;
    attemptTime;
    // Model associations
    static associate(models) {
        FailedAttempt.belongsTo(models.Voter, {
            foreignKey: 'user_id',
            as: 'voter',
        });
    }
    static initialize(sequelize) {
        return FailedAttempt.init({
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
            attemptType: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: false,
                field: 'attempt_type',
                validate: {
                    isIn: [Object.values(AttemptType)],
                },
            },
            ipAddress: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: true,
                field: 'ip_address',
            },
            userAgent: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
                field: 'user_agent',
            },
            attemptTime: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                defaultValue: sequelize_1.DataTypes.NOW,
                field: 'attempt_time',
            },
        }, {
            sequelize,
            modelName: 'FailedAttempt',
            tableName: 'failed_attempts',
            timestamps: false,
        });
    }
}
exports.default = FailedAttempt;
//# sourceMappingURL=FailedAttempt.js.map