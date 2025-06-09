"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class ElectionStats extends sequelize_1.Model {
    // Model associations
    static associate(models) {
        ElectionStats.belongsTo(models.Election, {
            foreignKey: 'election_id',
            as: 'election',
        });
    }
    static initialize(sequelize) {
        return ElectionStats.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
            },
            electionId: {
                type: sequelize_1.DataTypes.UUID,
                field: 'election_id',
                allowNull: false,
                unique: true,
                references: {
                    model: 'elections',
                    key: 'id',
                },
            },
            totalVotes: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                field: 'total_votes',
            },
            validVotes: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                field: 'valid_votes',
            },
            invalidVotes: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                field: 'invalid_votes',
            },
            turnoutPercentage: {
                type: sequelize_1.DataTypes.DECIMAL(5, 2),
                allowNull: false,
                defaultValue: 0,
                field: 'turnout_percentage',
            },
            lastUpdated: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                defaultValue: sequelize_1.DataTypes.NOW,
                field: 'last_updated',
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
                field: 'updated_at',
                defaultValue: sequelize_1.DataTypes.NOW,
            },
        }, {
            sequelize,
            modelName: 'ElectionStats',
            tableName: 'election_stats',
            timestamps: true,
        });
    }
}
// Timestamps
ElectionStats.createdAt = 'createdAt';
ElectionStats.updatedAt = 'updatedAt';
exports.default = ElectionStats;
//# sourceMappingURL=ElectionStats.js.map