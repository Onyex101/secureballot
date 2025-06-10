"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoteSource = void 0;
const sequelize_1 = require("sequelize");
// Vote source enum
var VoteSource;
(function (VoteSource) {
    VoteSource["WEB"] = "web";
    VoteSource["MOBILE"] = "mobile";
    VoteSource["USSD"] = "ussd";
    VoteSource["OFFLINE"] = "offline";
})(VoteSource = exports.VoteSource || (exports.VoteSource = {}));
class Vote extends sequelize_1.Model {
    id;
    userId;
    electionId;
    candidateId;
    pollingUnitId;
    encryptedVoteData;
    encryptedAesKey;
    iv;
    voteHash;
    publicKeyFingerprint;
    voteTimestamp;
    voteSource;
    isCounted;
    receiptCode;
    createdAt;
    updatedAt;
    voter;
    election;
    candidate;
    pollingUnit;
    static associate(models) {
        Vote.belongsTo(models.Voter, {
            foreignKey: 'user_id',
            targetKey: 'id',
            as: 'voter',
        });
        Vote.belongsTo(models.Election, {
            foreignKey: 'election_id',
            targetKey: 'id',
            as: 'election',
        });
        Vote.belongsTo(models.Candidate, {
            foreignKey: 'candidate_id',
            targetKey: 'id',
            as: 'candidate',
        });
        Vote.belongsTo(models.PollingUnit, {
            foreignKey: 'polling_unit_id',
            targetKey: 'id',
            as: 'pollingUnit',
        });
    }
    static initialize(sequelize) {
        return Vote.init({
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
            pollingUnitId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                field: 'polling_unit_id',
                references: {
                    model: 'polling_units',
                    key: 'id',
                },
                onDelete: 'RESTRICT',
                onUpdate: 'CASCADE',
            },
            encryptedVoteData: {
                field: 'encrypted_vote_data',
                type: sequelize_1.DataTypes.BLOB,
                allowNull: false,
            },
            encryptedAesKey: {
                field: 'encrypted_aes_key',
                type: sequelize_1.DataTypes.TEXT,
                allowNull: false,
            },
            iv: {
                field: 'iv',
                type: sequelize_1.DataTypes.STRING(32),
                allowNull: false,
            },
            voteHash: {
                field: 'vote_hash',
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: false,
            },
            publicKeyFingerprint: {
                field: 'public_key_fingerprint',
                type: sequelize_1.DataTypes.STRING(16),
                allowNull: false,
            },
            voteTimestamp: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                field: 'vote_timestamp',
                defaultValue: sequelize_1.DataTypes.NOW,
            },
            voteSource: {
                field: 'vote_source',
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: false,
                validate: {
                    isIn: [Object.values(VoteSource)],
                },
            },
            isCounted: {
                field: 'is_counted',
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            receiptCode: {
                field: 'receipt_code',
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: false,
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
        }, {
            sequelize,
            modelName: 'Vote',
            tableName: 'votes',
            underscored: false,
            timestamps: true,
            indexes: [
                { unique: true, fields: ['user_id', 'election_id'] },
                { fields: ['election_id'] },
                { fields: ['candidate_id'] },
                { fields: ['polling_unit_id'] },
                { fields: ['vote_timestamp'] },
                { fields: ['vote_source'] },
                { fields: ['is_counted'] },
            ],
        });
    }
}
exports.default = Vote;
//# sourceMappingURL=Vote.js.map