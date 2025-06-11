"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class UssdVote extends sequelize_1.Model {
    // Timestamps
    static createdAt = 'createdAt';
    static updatedAt = 'updatedAt';
    // Model associations
    static associate(models) {
        UssdVote.belongsTo(models.UssdSession, {
            foreignKey: 'session_code',
            targetKey: 'sessionCode',
            as: 'session',
        });
        UssdVote.belongsTo(models.Voter, {
            foreignKey: 'user_id',
            as: 'voter',
        });
        UssdVote.belongsTo(models.Election, {
            foreignKey: 'election_id',
            as: 'election',
        });
        UssdVote.belongsTo(models.Candidate, {
            foreignKey: 'candidate_id',
            as: 'candidate',
        });
    }
    static initialize(sequelize) {
        return UssdVote.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
            },
            sessionCode: {
                type: sequelize_1.DataTypes.STRING(10),
                allowNull: false,
                field: 'session_code',
                references: {
                    model: 'ussd_sessions',
                    key: 'session_code',
                },
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE',
            },
            userId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                field: 'user_id',
                references: {
                    model: 'voters',
                    key: 'id',
                },
                onDelete: 'RESTRICT',
                onUpdate: 'CASCADE',
            },
            electionId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                field: 'election_id',
                references: {
                    model: 'elections',
                    key: 'id',
                },
                onDelete: 'RESTRICT',
                onUpdate: 'CASCADE',
            },
            candidateId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                field: 'candidate_id',
                references: {
                    model: 'candidates',
                    key: 'id',
                },
                onDelete: 'RESTRICT',
                onUpdate: 'CASCADE',
            },
            voteTimestamp: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                defaultValue: sequelize_1.DataTypes.NOW,
                field: 'vote_timestamp',
            },
            confirmationCode: {
                type: sequelize_1.DataTypes.STRING(10),
                allowNull: false,
                field: 'confirmation_code',
            },
            isProcessed: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
                field: 'is_processed',
            },
            processedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
                field: 'processed_at',
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
            modelName: 'UssdVote',
            tableName: 'ussd_votes',
            underscored: false,
            timestamps: true,
            indexes: [
                { unique: true, fields: ['session_code', 'election_id'] },
                { fields: ['user_id'] },
                { fields: ['election_id'] },
                { fields: ['candidate_id'] },
                { fields: ['is_processed'] },
            ],
        });
    }
}
exports.default = UssdVote;
//# sourceMappingURL=UssdVote.js.map