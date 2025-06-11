import { Model, DataTypes, Sequelize, Optional } from 'sequelize';

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
    | 'id'
    | 'totalVotes'
    | 'validVotes'
    | 'invalidVotes'
    | 'turnoutPercentage'
    | 'lastUpdated'
    | 'createdAt'
    | 'updatedAt'
  > {}

class ElectionStats
  extends Model<ElectionStatsAttributes, ElectionStatsCreationAttributes>
  implements ElectionStatsAttributes
{
  declare id: string;
  declare electionId: string;
  declare totalVotes: number;
  declare validVotes: number;
  declare invalidVotes: number;
  declare turnoutPercentage: number;
  declare lastUpdated: Date;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  // Timestamps
  public static readonly createdAt = 'createdAt';
  public static readonly updatedAt = 'updatedAt';

  // Model associations
  public static associate(models: any): void {
    ElectionStats.belongsTo(models.Election, {
      foreignKey: 'election_id',
      as: 'election',
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
          field: 'election_id',
          allowNull: false,
          unique: true,
          references: {
            model: 'elections',
            key: 'id',
          },
        },
        totalVotes: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          field: 'total_votes',
        },
        validVotes: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          field: 'valid_votes',
        },
        invalidVotes: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          field: 'invalid_votes',
        },
        turnoutPercentage: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: false,
          defaultValue: 0,
          field: 'turnout_percentage',
        },
        lastUpdated: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
          field: 'last_updated',
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
          field: 'updated_at',
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize,
        modelName: 'ElectionStats',
        tableName: 'election_stats',
        timestamps: true,
      },
    );
  }
}

export default ElectionStats;
