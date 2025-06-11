"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CandidateStatus = void 0;
const sequelize_1 = require("sequelize");
// Candidate status enum
var CandidateStatus;
(function (CandidateStatus) {
    CandidateStatus["PENDING"] = "pending";
    CandidateStatus["APPROVED"] = "approved";
    CandidateStatus["REJECTED"] = "rejected";
    CandidateStatus["DISQUALIFIED"] = "disqualified";
})(CandidateStatus = exports.CandidateStatus || (exports.CandidateStatus = {}));
// Remove @Table decorator
class Candidate extends sequelize_1.Model {
    // Associations (defined in associate method)
    election;
    votes;
    // Re-add static associate method
    static associate(models) {
        Candidate.belongsTo(models.Election, {
            foreignKey: 'electionId',
            targetKey: 'id',
            as: 'election',
        });
        Candidate.hasMany(models.Vote, {
            foreignKey: 'candidateId',
            sourceKey: 'id',
            as: 'votes',
        });
    }
    // Re-add static initialize method
    static initialize(sequelize) {
        return Candidate.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
            },
            electionId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                field: 'election_id',
                references: {
                    model: 'elections',
                    key: 'id',
                },
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE',
            },
            fullName: {
                type: sequelize_1.DataTypes.STRING(100),
                allowNull: false,
                field: 'full_name',
                validate: {
                    notEmpty: true,
                },
            },
            partyCode: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: false,
                field: 'party_code',
                validate: {
                    notEmpty: true,
                },
            },
            partyName: {
                type: sequelize_1.DataTypes.STRING(100),
                field: 'party_name',
                allowNull: false,
                validate: {
                    notEmpty: true,
                },
            },
            bio: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            photoUrl: {
                type: sequelize_1.DataTypes.TEXT,
                field: 'photo_url',
                allowNull: true,
                validate: {
                    isUrl: true,
                },
            },
            position: {
                type: sequelize_1.DataTypes.STRING(100),
                allowNull: true,
            },
            manifesto: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            status: {
                type: sequelize_1.DataTypes.STRING(20),
                allowNull: false,
                defaultValue: CandidateStatus.PENDING,
                validate: {
                    isIn: [Object.values(CandidateStatus)],
                },
            },
            isActive: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
                field: 'is_active',
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
            modelName: 'Candidate',
            tableName: 'candidates',
            underscored: false,
            timestamps: true,
            indexes: [
                { fields: ['election_id'] },
                { fields: ['party_code'] },
                { fields: ['status'] },
                { fields: ['is_active'] },
                { unique: true, fields: ['election_id', 'party_code'] }, // Matches SQL constraint
            ],
            hooks: {
                beforeUpdate: (candidate) => {
                    // Update isActive based on status
                    if (candidate.status === CandidateStatus.REJECTED ||
                        candidate.status === CandidateStatus.DISQUALIFIED) {
                        candidate.isActive = false;
                    }
                    else if (candidate.status === CandidateStatus.APPROVED) {
                        candidate.isActive = true;
                    }
                },
            },
        });
    }
}
exports.default = Candidate;
//# sourceMappingURL=Candidate.js.map