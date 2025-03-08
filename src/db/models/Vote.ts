import { Model, DataTypes, Sequelize, Optional } from 'sequelize';

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
  voteHash: string;
  voteTimestamp: Date;
  voteSource: VoteSource;
  isCounted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface VoteCreationAttributes extends Optional<VoteAttributes, 'id' | 'voteTimestamp' | 'isCounted' | 'createdAt' | 'updatedAt'> {}

class Vote extends Model<VoteAttributes, VoteCreationAttributes> implements VoteAttributes {
  public id!: string;
  public userId!: string;
  public electionId!: string;
  public candidateId!: string;
  public pollingUnitId!: string;
  public encryptedVoteData!: Buffer;
  public voteHash!: string;
  public voteTimestamp!: Date;
  public voteSource!: VoteSource;
  public isCounted!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Timestamps
  public static readonly createdAt = 'createdAt';
  public static readonly updatedAt = 'updatedAt';

  // Model associations
  public static associate(models: any): void {
    Vote.belongsTo(models.Voter, {
      foreignKey: 'userId',
      as: 'voter',
    });

    Vote.belongsTo(models.Election, {
      foreignKey: 'electionId',
      as: 'election',
    });

    Vote.belongsTo(models.Candidate, {
      foreignKey: 'candidateId',
      as: 'candidate',
    });

    Vote.belongsTo(models.PollingUnit, {
      foreignKey: 'pollingUnitId',
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
          references: {
            model: 'polling_units',
            key: 'id',
          },
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE',
        },
        encryptedVoteData: {
          type: DataTypes.BLOB,
          allowNull: false,
        },
        voteHash: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        voteTimestamp: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        voteSource: {
          type: DataTypes.STRING(50),
          allowNull: false,
          validate: {
            isIn: [Object.values(VoteSource)],
          },
        },
        isCounted: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        updatedAt: {
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
          { unique: true, fields: ['userId', 'electionId'] },
          { fields: ['electionId'] },
          { fields: ['candidateId'] },
          { fields: ['pollingUnitId'] },
          { fields: ['voteTimestamp'] },
          { fields: ['voteSource'] },
          { fields: ['isCounted'] },
        ],
      }
    );
  }
}

export default Vote;