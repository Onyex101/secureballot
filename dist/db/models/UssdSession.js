"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UssdSessionStatus = void 0;
const sequelize_1 = require("sequelize");
// USSD session status enum
var UssdSessionStatus;
(function (UssdSessionStatus) {
    UssdSessionStatus["CREATED"] = "created";
    UssdSessionStatus["AUTHENTICATED"] = "authenticated";
    UssdSessionStatus["ELECTION_SELECTED"] = "election_selected";
    UssdSessionStatus["CANDIDATE_SELECTED"] = "candidate_selected";
    UssdSessionStatus["VOTE_CONFIRMED"] = "vote_confirmed";
    UssdSessionStatus["COMPLETED"] = "completed";
    UssdSessionStatus["EXPIRED"] = "expired";
    UssdSessionStatus["CANCELLED"] = "cancelled";
})(UssdSessionStatus = exports.UssdSessionStatus || (exports.UssdSessionStatus = {}));
class UssdSession extends sequelize_1.Model {
    // Model associations
    static associate(models) {
        UssdSession.belongsTo(models.Voter, {
            foreignKey: 'user_id',
            as: 'voter',
        });
        UssdSession.hasMany(models.UssdVote, {
            foreignKey: 'session_code',
            sourceKey: 'sessionCode',
            as: 'votes',
        });
    }
    static initialize(sequelize) {
        return UssdSession.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
            },
            userId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                field: 'user_id',
                references: {
                    model: 'voters',
                    key: 'id',
                },
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE',
            },
            sessionCode: {
                type: sequelize_1.DataTypes.STRING(10),
                allowNull: false,
                unique: true,
                field: 'session_code',
                validate: {
                    notEmpty: true,
                },
            },
            phoneNumber: {
                type: sequelize_1.DataTypes.STRING(15),
                allowNull: false,
                field: 'phone_number',
                validate: {
                    is: /^\+?[0-9]{10,15}$/,
                    notEmpty: true,
                },
            },
            sessionData: {
                type: sequelize_1.DataTypes.JSONB,
                allowNull: true,
                field: 'session_data',
            },
            createdAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                defaultValue: sequelize_1.DataTypes.NOW,
                field: 'created_at',
            },
            expiresAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                field: 'expires_at',
            },
            isActive: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
                field: 'is_active',
            },
            sessionStatus: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: false,
                defaultValue: UssdSessionStatus.CREATED,
                field: 'session_status',
                validate: {
                    isIn: [Object.values(UssdSessionStatus)],
                },
            },
            lastActivity: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                defaultValue: sequelize_1.DataTypes.NOW,
                field: 'last_activity',
            },
            updatedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                defaultValue: sequelize_1.DataTypes.NOW,
                field: 'updated_at',
            },
        }, {
            sequelize,
            modelName: 'UssdSession',
            tableName: 'ussd_sessions',
            underscored: false,
            timestamps: true,
            indexes: [
                { unique: true, fields: ['session_code'] },
                { fields: ['phone_number'] },
                { fields: ['user_id'] },
                { fields: ['is_active'] },
                { fields: ['session_status'] },
                { fields: ['expires_at'] },
            ],
            hooks: {
                beforeCreate: (session) => {
                    // Set expiration date to 15 minutes from now by default
                    const expiry = new Date();
                    expiry.setMinutes(expiry.getMinutes() + 15);
                    session.expiresAt = expiry;
                },
                beforeUpdate: (session) => {
                    // Update lastActivity timestamp on each update
                    session.lastActivity = new Date();
                    // Check if session is expired
                    if (new Date() > session.expiresAt && session.isActive) {
                        session.isActive = false;
                        session.sessionStatus = UssdSessionStatus.EXPIRED;
                    }
                },
            },
        });
    }
}
// Timestamps
UssdSession.createdAt = 'createdAt';
UssdSession.updatedAt = 'updatedAt';
exports.default = UssdSession;
//# sourceMappingURL=UssdSession.js.map