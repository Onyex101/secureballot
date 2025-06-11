"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class ElectionKey extends sequelize_1.Model {
    // Associations
    election;
    generatedByAdmin;
    static associate(models) {
        ElectionKey.belongsTo(models.Election, {
            foreignKey: 'electionId',
            targetKey: 'id',
            as: 'election',
        });
        ElectionKey.belongsTo(models.AdminUser, {
            foreignKey: 'keyGeneratedBy',
            targetKey: 'id',
            as: 'generatedByAdmin',
        });
    }
    static initialize(sequelize) {
        return ElectionKey.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
            },
            electionId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                field: 'election_id',
                unique: true,
                references: {
                    model: 'elections',
                    key: 'id',
                },
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE',
            },
            publicKey: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: false,
                field: 'public_key',
            },
            publicKeyFingerprint: {
                type: sequelize_1.DataTypes.STRING(64),
                allowNull: false,
                field: 'public_key_fingerprint',
                unique: true,
            },
            privateKeyShares: {
                type: sequelize_1.DataTypes.JSONB,
                allowNull: false,
                field: 'private_key_shares',
                validate: {
                    isValidArray(value) {
                        if (!Array.isArray(value)) {
                            throw new Error('Private key shares must be an array');
                        }
                        if (value.length === 0) {
                            throw new Error('Private key shares array cannot be empty');
                        }
                    },
                },
            },
            keyGeneratedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                field: 'key_generated_at',
                defaultValue: sequelize_1.DataTypes.NOW,
            },
            keyGeneratedBy: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                field: 'key_generated_by',
                references: {
                    model: 'admin_users',
                    key: 'id',
                },
                onDelete: 'RESTRICT',
                onUpdate: 'CASCADE',
            },
            isActive: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                field: 'is_active',
                defaultValue: true,
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
            tableName: 'election_keys',
            underscored: true,
            timestamps: true,
            indexes: [
                {
                    fields: ['election_id'],
                    name: 'idx_election_keys_election_id',
                },
                {
                    fields: ['public_key_fingerprint'],
                    name: 'idx_election_keys_fingerprint',
                    unique: true,
                },
                {
                    fields: ['is_active'],
                    name: 'idx_election_keys_active',
                },
            ],
        });
    }
}
exports.default = ElectionKey;
//# sourceMappingURL=ElectionKey.js.map