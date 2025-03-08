import { Model, DataTypes, Sequelize, Optional } from "sequelize";

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
    | "id"
    | "voteTimestamp"
    | "isVerified"
    | "isCounted"
    | "createdAt"
    | "updatedAt"
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
  public static readonly createdAt = "createdAt";
  public static readonly updatedAt = "updatedAt";

  // Model associations
  public static associate(models: any): void {
    UssdVote.belongsTo(models.UssdSession, {
      foreignKey: "sessionId",
      as: "session",
    });

    UssdVote.belongsTo(models.Election, {
      foreignKey: "electionId",
      as: "election",
    });

    UssdVote.belongsTo(models.Candidate, {
      foreignKey: "candidateId",
      as: "candidate",
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
          references: {
            model: "ussd_sessions",
            key: "id",
          },
          onDelete: "CASCADE",
          onUpdate: "CASCADE",
        },
        electionId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: "elections",
            key: "id",
          },
          onDelete: "RESTRICT",
          onUpdate: "CASCADE",
        },
        candidateId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: "candidates",
            key: "id",
          },
          onDelete: "RESTRICT",
          onUpdate: "CASCADE",
        },
        voteTimestamp: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        isVerified: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
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
        modelName: "UssdVote",
        tableName: "ussd_votes",
        underscored: false,
        timestamps: true,
        indexes: [
          { unique: true, fields: ["sessionId", "electionId"] },
          { fields: ["electionId"] },
          { fields: ["candidateId"] },
          { fields: ["isVerified"] },
          { fields: ["isCounted"] },
        ],
      },
    );
  }
}

export default UssdVote;
