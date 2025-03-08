import { Model, DataTypes, Sequelize, Optional } from "sequelize";

// Candidate status enum
export enum CandidateStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  DISQUALIFIED = "disqualified",
}

interface CandidateAttributes {
  id: string;
  electionId: string;
  fullName: string;
  partyCode: string;
  partyName: string;
  bio: string | null;
  photoUrl: string | null;
  position: string | null;
  manifesto: string | null;
  status: CandidateStatus;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface CandidateCreationAttributes
  extends Optional<
    CandidateAttributes,
    | "id"
    | "bio"
    | "photoUrl"
    | "position"
    | "manifesto"
    | "status"
    | "isActive"
    | "createdAt"
    | "updatedAt"
  > {}

class Candidate
  extends Model<CandidateAttributes, CandidateCreationAttributes>
  implements CandidateAttributes
{
  public id!: string;
  public electionId!: string;
  public fullName!: string;
  public partyCode!: string;
  public partyName!: string;
  public bio!: string | null;
  public photoUrl!: string | null;
  public position!: string | null;
  public manifesto!: string | null;
  public status!: CandidateStatus;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Timestamps
  public static readonly createdAt = "createdAt";
  public static readonly updatedAt = "updatedAt";

  // Model associations
  public static associate(models: any): void {
    Candidate.belongsTo(models.Election, {
      foreignKey: "electionId",
      as: "election",
    });

    Candidate.hasMany(models.Vote, {
      foreignKey: "candidateId",
      as: "votes",
    });
  }

  public static initialize(sequelize: Sequelize): typeof Candidate {
    return Candidate.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        electionId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: "elections",
            key: "id",
          },
          onDelete: "CASCADE",
          onUpdate: "CASCADE",
        },
        fullName: {
          type: DataTypes.STRING(100),
          allowNull: false,
          validate: {
            notEmpty: true,
          },
        },
        partyCode: {
          type: DataTypes.STRING(50),
          allowNull: false,
          validate: {
            notEmpty: true,
          },
        },
        partyName: {
          type: DataTypes.STRING(100),
          allowNull: false,
          validate: {
            notEmpty: true,
          },
        },
        bio: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        photoUrl: {
          type: DataTypes.STRING(255),
          allowNull: true,
          validate: {
            isUrl: true,
          },
        },
        position: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },
        manifesto: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        status: {
          type: DataTypes.STRING(20),
          allowNull: false,
          defaultValue: CandidateStatus.PENDING,
          validate: {
            isIn: [Object.values(CandidateStatus)],
          },
        },
        isActive: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
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
        modelName: "Candidate",
        tableName: "candidates",
        underscored: false,
        timestamps: true,
        indexes: [
          { fields: ["electionId"] },
          { fields: ["partyCode"] },
          { fields: ["status"] },
          { fields: ["isActive"] },
          { unique: true, fields: ["electionId", "partyCode"] },
        ],
        hooks: {
          beforeUpdate: async (candidate: Candidate) => {
            // Update isActive based on status
            if (
              candidate.status === CandidateStatus.REJECTED ||
              candidate.status === CandidateStatus.DISQUALIFIED
            ) {
              candidate.isActive = false;
            } else if (candidate.status === CandidateStatus.APPROVED) {
              candidate.isActive = true;
            }
          },
        },
      },
    );
  }
}

export default Candidate;
