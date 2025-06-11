import { Model, DataTypes, Sequelize, Optional } from 'sequelize';
import Voter from './Voter';
import Election from './Election';
import Candidate from './Candidate';
import PollingUnit from './PollingUnit';

// Vote source enum
export enum VoteSource {
  WEB = 'web',
  MOBILE = 'mobile',
  USSD = 'ussd',
  OFFLINE = 'offline',
}

interface VoteAttributes {
  id: string;
  userId: string;
  electionId: string;
  candidateId: string;
  pollingUnitId: string;
  encryptedVoteData: Buffer;
  encryptedAesKey: string;
  iv: string;
  voteHash: string;
  publicKeyFingerprint: string;
  voteTimestamp: Date;
  voteSource: VoteSource;
  isCounted: boolean;
  receiptCode: string;
  createdAt: Date;
  updatedAt: Date;
}

interface VoteCreationAttributes
  extends Optional<
    VoteAttributes,
    'id' | 'voteTimestamp' | 'isCounted' | 'createdAt' | 'updatedAt' | 'receiptCode'
  > {}

class Vote extends Model<VoteAttributes, VoteCreationAttributes> implements VoteAttributes {
  declare id: string;
  declare userId: string;
  declare electionId: string;
  declare candidateId: string;
  declare pollingUnitId: string;
  declare encryptedVoteData: Buffer;
  declare encryptedAesKey: string;
  declare iv: string;
  declare voteHash: string;
  declare publicKeyFingerprint: string;
  declare voteTimestamp: Date;
  declare voteSource: VoteSource;
  declare isCounted: boolean;
  declare receiptCode: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  public voter?: Voter;
  public election?: Election;
  public candidate?: Candidate;
  public pollingUnit?: PollingUnit;

  public static associate(models: any): void {
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

  public static initialize(sequelize: Sequelize): typeof Vote {
    return Vote.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        userId: {
          type: DataTypes.UUID,
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
          type: DataTypes.UUID,
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
          type: DataTypes.UUID,
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
          type: DataTypes.UUID,
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
          type: DataTypes.BLOB,
          allowNull: false,
        },
        encryptedAesKey: {
          field: 'encrypted_aes_key',
          type: DataTypes.TEXT,
          allowNull: false,
        },
        iv: {
          field: 'iv',
          type: DataTypes.STRING(32),
          allowNull: false,
        },
        voteHash: {
          field: 'vote_hash',
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        publicKeyFingerprint: {
          field: 'public_key_fingerprint',
          type: DataTypes.STRING(16),
          allowNull: false,
        },
        voteTimestamp: {
          type: DataTypes.DATE,
          allowNull: false,
          field: 'vote_timestamp',
          defaultValue: DataTypes.NOW,
        },
        voteSource: {
          field: 'vote_source',
          type: DataTypes.STRING(50),
          allowNull: false,
          validate: {
            isIn: [Object.values(VoteSource)],
          },
        },
        isCounted: {
          field: 'is_counted',
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        receiptCode: {
          field: 'receipt_code',
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        createdAt: {
          field: 'created_at',
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        updatedAt: {
          field: 'updated_at',
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      },
      {
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
      },
    );
  }
}

export default Vote;
