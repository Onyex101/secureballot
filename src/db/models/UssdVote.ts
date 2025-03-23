import { Model, DataTypes, Sequelize, Optional } from 'sequelize';

interface UssdVoteAttributes {
  id: string;
  sessionId: string;
  electionId: string;
  candidateId: string;
  voteTimestamp: Date;
  isVerified: boolean;
  isCounted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface UssdVoteCreationAttributes
  extends Optional<
    UssdVoteAttributes,
    'id' | 'voteTimestamp' | 'isVerified' | 'isCounted' | 'createdAt' | 'updatedAt'
  > {}

class UssdVote
  extends Model<UssdVoteAttributes, UssdVoteCreationAttributes>
  implements UssdVoteAttributes
{
  public id!: string;
  public sessionId!: string;
  public electionId!: string;
  public candidateId!: string;
  public voteTimestamp!: Date;
  public isVerified!: boolean;
  public isCounted!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Timestamps
  public static readonly createdAt = 'createdAt';
  public static readonly updatedAt = 'updatedAt';

  // Model associations
  public static associate(models: any): void {
    UssdVote.belongsTo(models.UssdSession, {
      foreignKey: 'session_id',
      as: 'session',
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

  public static initialize(sequelize: Sequelize): typeof UssdVote {
    return UssdVote.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        sessionId: {
          type: DataTypes.UUID,
          allowNull: false,
          field: 'session_id',
          references: {
            model: 'ussd_sessions',
            key: 'id',
          },
          onDelete: 'CASCADE',
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
        voteTimestamp: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
          field: 'vote_timestamp',
        },
        isVerified: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          field: 'is_verified',
        },
        isCounted: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          field: 'is_counted',
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
        modelName: 'UssdVote',
        tableName: 'ussd_votes',
        underscored: false,
        timestamps: true,
        indexes: [
          { unique: true, fields: ['session_id', 'election_id'] },
          { fields: ['election_id'] },
          { fields: ['candidate_id'] },
          { fields: ['is_verified'] },
          { fields: ['is_counted'] },
        ],
      },
    );
  }
}

export default UssdVote;
