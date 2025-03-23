import { Model, DataTypes, Sequelize, Optional } from 'sequelize';

// Election status enum
export enum ElectionStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

// Election type enum
export enum ElectionType {
  PRESIDENTIAL = 'Presidential',
  GUBERNATORIAL = 'Gubernatorial',
  SENATORIAL = 'Senatorial',
  HOUSE_OF_REPS = 'HouseOfReps',
  STATE_ASSEMBLY = 'StateAssembly',
  LOCAL_GOVERNMENT = 'LocalGovernment',
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
    'id' | 'description' | 'isActive' | 'status' | 'eligibilityRules' | 'createdAt' | 'updatedAt'
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
  public static readonly createdAt = 'createdAt';
  public static readonly updatedAt = 'updatedAt';

  // Model associations
  public static associate(models: any): void {
    Election.hasMany(models.Candidate, {
      foreignKey: 'election_id',
      as: 'candidates',
    });

    Election.hasMany(models.Vote, {
      foreignKey: 'election_id',
      as: 'votes',
    });

    Election.hasOne(models.ElectionStats, {
      foreignKey: 'election_id',
      as: 'stats',
    });

    Election.belongsTo(models.AdminUser, {
      foreignKey: 'created_by',
      as: 'creator',
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
          field: 'election_name',
          allowNull: false,
          validate: {
            notEmpty: true,
          },
        },
        electionType: {
          type: DataTypes.STRING(50),
          field: 'election_type',
          allowNull: false,
          validate: {
            isIn: [Object.values(ElectionType)],
          },
        },
        startDate: {
          type: DataTypes.DATE,
          field: 'start_date',
          allowNull: false,
        },
        endDate: {
          type: DataTypes.DATE,
          field: 'end_date',
          allowNull: false,
          validate: {
            isAfterStartDate(this: any, value: Date) {
              if (value <= this.startDate) {
                throw new Error('End date must be after start date');
              }
            },
          },
        },
        description: {
          type: DataTypes.TEXT,
          field: 'description',
          allowNull: true,
        },
        isActive: {
          type: DataTypes.BOOLEAN,
          field: 'is_active',
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
          field: 'eligibility_rules',
        },
        createdBy: {
          type: DataTypes.UUID,
          allowNull: false,
          field: 'created_by',
          references: {
            model: 'admin_users',
            key: 'id',
          },
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
        modelName: 'Election',
        tableName: 'elections',
        underscored: false,
        timestamps: true,
        indexes: [
          { fields: ['election_type'] },
          { fields: ['start_date', 'end_date'] },
          { fields: ['status'] },
          { fields: ['is_active'] },
        ],
        hooks: {
          beforeCreate: async (election: Election) => {
            // Validate dates
            if (election.startDate >= election.endDate) {
              throw new Error('End date must be after start date');
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
