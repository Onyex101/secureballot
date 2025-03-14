import { Model, DataTypes, Sequelize, Optional } from "sequelize";

interface ElectionStatsAttributes {
  id: string;
  electionId: string;
  totalVotes: number;
  validVotes: number;
  invalidVotes: number;
  turnoutPercentage: number;
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface ElectionStatsCreationAttributes
  extends Optional<
    ElectionStatsAttributes,
    | "id"
    | "totalVotes"
    | "validVotes"
    | "invalidVotes"
    | "turnoutPercentage"
    | "lastUpdated"
    | "createdAt"
    | "updatedAt"
  > {}

class ElectionStats
  extends Model<ElectionStatsAttributes, ElectionStatsCreationAttributes>
  implements ElectionStatsAttributes
{
  public id!: string;
  public electionId!: string;
  public totalVotes!: number;
  public validVotes!: number;
  public invalidVotes!: number;
  public turnoutPercentage!: number;
  public lastUpdated!: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Timestamps
  public static readonly createdAt = "createdAt";
  public static readonly updatedAt = "updatedAt";

  // Model associations
  public static associate(models: any): void {
    ElectionStats.belongsTo(models.Election, {
      foreignKey: "electionId",
      as: "election",
    });
  }

  public static initialize(sequelize: Sequelize): typeof ElectionStats {
    return ElectionStats.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        electionId: {
          type: DataTypes.UUID,
          allowNull: false,
          unique: true,
          references: {
            model: "elections",
            key: "id",
          },
        },
        totalVotes: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        validVotes: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        invalidVotes: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        turnoutPercentage: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: false,
          defaultValue: 0,
        },
        lastUpdated: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
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
        modelName: "ElectionStats",
        tableName: "election_stats",
        timestamps: true,
      }
    );
  }
}

export default ElectionStats; 