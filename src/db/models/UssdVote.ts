import { Model, DataTypes, Sequelize, Optional } from 'sequelize';

interface UssdVoteAttributes {
  id: string;
  sessionCode: string;
  userId: string;
  electionId: string;
  candidateId: string;
  voteTimestamp: Date;
  confirmationCode: string;
  isProcessed: boolean;
  processedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface UssdVoteCreationAttributes
  extends Optional<
    UssdVoteAttributes,
    'id' | 'voteTimestamp' | 'isProcessed' | 'processedAt' | 'createdAt' | 'updatedAt'
  > {}

class UssdVote
  extends Model<UssdVoteAttributes, UssdVoteCreationAttributes>
  implements UssdVoteAttributes
{
  declare id: string;
  declare sessionCode: string;
  declare userId: string;
  declare electionId: string;
  declare candidateId: string;
  declare voteTimestamp: Date;
  declare confirmationCode: string;
  declare isProcessed: boolean;
  declare processedAt: Date | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  // Timestamps
  public static readonly createdAt = 'createdAt';
  public static readonly updatedAt = 'updatedAt';

  // Model associations
  public static associate(models: any): void {
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

  public static initialize(sequelize: Sequelize): typeof UssdVote {
    return UssdVote.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        sessionCode: {
          type: DataTypes.STRING(10),
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
        voteTimestamp: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
          field: 'vote_timestamp',
        },
        confirmationCode: {
          type: DataTypes.STRING(10),
          allowNull: false,
          field: 'confirmation_code',
        },
        isProcessed: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          field: 'is_processed',
        },
        processedAt: {
          type: DataTypes.DATE,
          allowNull: true,
          field: 'processed_at',
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
          { unique: true, fields: ['session_code', 'election_id'] },
          { fields: ['user_id'] },
          { fields: ['election_id'] },
          { fields: ['candidate_id'] },
          { fields: ['is_processed'] },
        ],
      },
    );
  }
}

export default UssdVote;
