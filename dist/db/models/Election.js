"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ElectionType = exports.ElectionStatus = void 0;
const sequelize_1 = require("sequelize");
// Election status enum
var ElectionStatus;
(function (ElectionStatus) {
    ElectionStatus["DRAFT"] = "draft";
    ElectionStatus["SCHEDULED"] = "scheduled";
    ElectionStatus["ACTIVE"] = "active";
    ElectionStatus["PAUSED"] = "paused";
    ElectionStatus["COMPLETED"] = "completed";
    ElectionStatus["CANCELLED"] = "cancelled";
})(ElectionStatus = exports.ElectionStatus || (exports.ElectionStatus = {}));
// Election type enum
var ElectionType;
(function (ElectionType) {
    ElectionType["PRESIDENTIAL"] = "Presidential";
    ElectionType["GUBERNATORIAL"] = "Gubernatorial";
    ElectionType["SENATORIAL"] = "Senatorial";
    ElectionType["HOUSE_OF_REPS"] = "HouseOfReps";
    ElectionType["STATE_ASSEMBLY"] = "StateAssembly";
    ElectionType["LOCAL_GOVERNMENT"] = "LocalGovernment";
})(ElectionType = exports.ElectionType || (exports.ElectionType = {}));
class Election extends sequelize_1.Model {
    static associate(models) {
        Election.hasMany(models.Candidate, {
            foreignKey: 'electionId',
            sourceKey: 'id',
            as: 'candidates',
        });
        Election.hasMany(models.Vote, {
            foreignKey: 'electionId',
            sourceKey: 'id',
            as: 'votes',
        });
        Election.hasOne(models.ElectionStats, {
            foreignKey: 'electionId',
            sourceKey: 'id',
            as: 'stats',
        });
        Election.belongsTo(models.AdminUser, {
            foreignKey: 'createdBy',
            targetKey: 'id',
            as: 'creator',
        });
    }
    static initialize(sequelize) {
        return Election.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
            },
            electionName: {
                type: sequelize_1.DataTypes.STRING(100),
                field: 'election_name',
                allowNull: false,
                validate: {
                    notEmpty: true,
                },
            },
            electionType: {
                type: sequelize_1.DataTypes.STRING(50),
                field: 'election_type',
                allowNull: false,
                validate: {
                    isIn: [Object.values(ElectionType)],
                },
            },
            startDate: {
                type: sequelize_1.DataTypes.DATE,
                field: 'start_date',
                allowNull: false,
            },
            endDate: {
                type: sequelize_1.DataTypes.DATE,
                field: 'end_date',
                allowNull: false,
                validate: {
                    isAfterStartDate(value) {
                        if (value <= this.startDate) {
                            throw new Error('End date must be after start date');
                        }
                    },
                },
            },
            description: {
                type: sequelize_1.DataTypes.TEXT,
                field: 'description',
                allowNull: true,
            },
            isActive: {
                type: sequelize_1.DataTypes.BOOLEAN,
                field: 'is_active',
                allowNull: false,
                defaultValue: false,
            },
            status: {
                type: sequelize_1.DataTypes.STRING(20),
                allowNull: false,
                defaultValue: ElectionStatus.DRAFT,
                validate: {
                    isIn: [Object.values(ElectionStatus)],
                },
            },
            eligibilityRules: {
                type: sequelize_1.DataTypes.JSONB,
                allowNull: true,
                field: 'eligibility_rules',
            },
            createdBy: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                field: 'created_by',
                references: {
                    model: 'admin_users',
                    key: 'id',
                },
                onDelete: 'RESTRICT',
                onUpdate: 'CASCADE',
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
            resultsPublished: {
                type: sequelize_1.DataTypes.BOOLEAN,
                field: 'results_published',
                allowNull: true,
                defaultValue: false,
            },
            resultsPublishedAt: {
                type: sequelize_1.DataTypes.DATE,
                field: 'results_published_at',
                allowNull: true,
            },
            preliminaryResultsPublished: {
                type: sequelize_1.DataTypes.BOOLEAN,
                field: 'preliminary_results_published',
                allowNull: true,
                defaultValue: false,
            },
            preliminaryResultsPublishedAt: {
                type: sequelize_1.DataTypes.DATE,
                field: 'preliminary_results_published_at',
                allowNull: true,
            },
            publicKeyFingerprint: {
                type: sequelize_1.DataTypes.STRING(16),
                field: 'public_key_fingerprint',
                allowNull: true,
            },
        }, {
            sequelize,
            modelName: 'Election',
            tableName: 'elections',
            underscored: false,
            timestamps: true,
            indexes: [
                { fields: ['election_type'] },
                { fields: ['start_date', 'end_date'] },
                { fields: ['status'] },
                { fields: ['is_active'] },
            ],
            hooks: {
                beforeCreate: (election) => {
                    if (election.startDate >= election.endDate) {
                        throw new Error('End date must be after start date');
                    }
                },
                beforeUpdate: (election) => {
                    if (election.status === ElectionStatus.ACTIVE) {
                        election.isActive = true;
                    }
                    else if (election.status === ElectionStatus.COMPLETED ||
                        election.status === ElectionStatus.CANCELLED) {
                        election.isActive = false;
                    }
                },
            },
        });
    }
}
exports.default = Election;
//# sourceMappingURL=Election.js.map