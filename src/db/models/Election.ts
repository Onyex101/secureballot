import { Model, DataTypes, Sequelize, Optional } from "sequelize";

// Election status enum
export enum ElectionStatus {
  DRAFT = "draft",
  SCHEDULED = "scheduled",
  ACTIVE = "active",
  PAUSED = "paused",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

// Election type enum
export enum ElectionType {
  PRESIDENTIAL = "Presidential",
  GUBERNATORIAL = "Gubernatorial",
  SENATORIAL = "Senatorial",
  HOUSE_OF_REPS = "HouseOfReps",
  STATE_ASSEMBLY = "StateAssembly",
  LOCAL_GOVERNMENT = "LocalGovernment",
}

interface ElectionAttributes {
  id: string;
  electionName: string;
  electionType: string;
  startDate: Date;
  endDate: Date;
  description: string | null;
  isActive: boolean;
  status: ElectionStatus;
  eligibilityRules: any | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ElectionCreationAttributes
  extends Optional<
    ElectionAttributes,
    | "id"
    | "description"
    | "isActive"
    | "status"
    | "eligibilityRules"
    | "createdAt"
    | "updatedAt"
  > {}

class Election
  extends Model<ElectionAttributes, ElectionCreationAttributes>
  implements ElectionAttributes
{
  public id!: string;
  public electionName!: string;
  public electionType!: string;
  public startDate!: Date;
  public endDate!: Date;
  public description!: string | null;
  public isActive!: boolean;
  public status!: ElectionStatus;
  public eligibilityRules!: any | null;
  public createdBy!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Timestamps
  public static readonly createdAt = "createdAt";
  public static readonly updatedAt = "updatedAt";

  // Model associations
  public static associate(models: any): void {
    Election.hasMany(models.Candidate, {
      foreignKey: "electionId",
      as: "candidates",
    });

    Election.hasMany(models.Vote, {
      foreignKey: "electionId",
      as: "votes",
    });

    Election.hasOne(models.ElectionStats, {
      foreignKey: "electionId",
      as: "stats",
    });

    Election.belongsTo(models.AdminUser, {
      foreignKey: "createdBy",
      as: "creator",
    });
  }

  public static initialize(sequelize: Sequelize): typeof Election {
    return Election.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        electionName: {
          type: DataTypes.STRING(100),
          allowNull: false,
          validate: {
            notEmpty: true,
          },
        },
        electionType: {
          type: DataTypes.STRING(50),
          allowNull: false,
          validate: {
            isIn: [Object.values(ElectionType)],
          },
        },
        startDate: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        endDate: {
          type: DataTypes.DATE,
          allowNull: false,
          validate: {
            isAfterStartDate(this: any, value: Date) {
              if (value <= this.startDate) {
                throw new Error("End date must be after start date");
              }
            },
          },
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        isActive: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        status: {
          type: DataTypes.STRING(20),
          allowNull: false,
          defaultValue: ElectionStatus.DRAFT,
          validate: {
            isIn: [Object.values(ElectionStatus)],
          },
        },
        eligibilityRules: {
          type: DataTypes.JSONB,
          allowNull: true,
        },
        createdBy: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: "admin_users",
            key: "id",
          },
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
        modelName: "Election",
        tableName: "elections",
        underscored: false,
        timestamps: true,
        indexes: [
          { fields: ["electionType"] },
          { fields: ["startDate", "endDate"] },
          { fields: ["status"] },
          { fields: ["isActive"] },
        ],
        hooks: {
          beforeCreate: async (election: Election) => {
            // Validate dates
            if (election.startDate >= election.endDate) {
              throw new Error("End date must be after start date");
            }
          },
          beforeUpdate: async (election: Election) => {
            // Update isActive based on status
            if (election.status === ElectionStatus.ACTIVE) {
              election.isActive = true;
            } else if (
              election.status === ElectionStatus.COMPLETED ||
              election.status === ElectionStatus.CANCELLED
            ) {
              election.isActive = false;
            }
          },
        },
      },
    );
  }
}

export default Election;
