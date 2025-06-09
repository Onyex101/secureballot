import { Model, DataTypes, Sequelize, Optional } from 'sequelize';
import Election from './Election';
import AdminUser from './AdminUser';

interface ElectionKeyAttributes {
  id: string;
  electionId: string;
  publicKey: string;
  publicKeyFingerprint: string;
  privateKeyShares: string[];
  keyGeneratedAt: Date;
  keyGeneratedBy: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface ElectionKeyCreationAttributes
  extends Optional<
    ElectionKeyAttributes,
    'id' | 'keyGeneratedAt' | 'isActive' | 'createdAt' | 'updatedAt'
  > {}

class ElectionKey
  extends Model<ElectionKeyAttributes, ElectionKeyCreationAttributes>
  implements ElectionKeyAttributes
{
  public id!: string;
  public electionId!: string;
  public publicKey!: string;
  public publicKeyFingerprint!: string;
  public privateKeyShares!: string[];
  public keyGeneratedAt!: Date;
  public keyGeneratedBy!: string;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Associations
  public election?: Election;
  public generatedByAdmin?: AdminUser;

  public static associate(models: any): void {
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

  public static initialize(sequelize: Sequelize): typeof ElectionKey {
    return ElectionKey.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        electionId: {
          type: DataTypes.UUID,
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
          type: DataTypes.TEXT,
          allowNull: false,
          field: 'public_key',
        },
        publicKeyFingerprint: {
          type: DataTypes.STRING(64),
          allowNull: false,
          field: 'public_key_fingerprint',
          unique: true,
        },
        privateKeyShares: {
          type: DataTypes.JSONB,
          allowNull: false,
          field: 'private_key_shares',
          validate: {
            isValidArray(value: any) {
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
          type: DataTypes.DATE,
          allowNull: false,
          field: 'key_generated_at',
          defaultValue: DataTypes.NOW,
        },
        keyGeneratedBy: {
          type: DataTypes.UUID,
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
          type: DataTypes.BOOLEAN,
          allowNull: false,
          field: 'is_active',
          defaultValue: true,
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
          field: 'created_at',
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
          field: 'updated_at',
        },
      },
      {
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
      },
    );
  }
}

export default ElectionKey;
