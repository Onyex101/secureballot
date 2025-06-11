import { Model, DataTypes, Sequelize, Optional } from 'sequelize';
import AdminUser from './AdminUser';
import Candidate from './Candidate';
import Vote from './Vote';
import ElectionStats from './ElectionStats';

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
  resultsPublished?: boolean;
  resultsPublishedAt?: Date;
  preliminaryResultsPublished?: boolean;
  preliminaryResultsPublishedAt?: Date;
  publicKeyFingerprint?: string;
}

interface ElectionCreationAttributes
  extends Optional<
    ElectionAttributes,
    | 'id'
    | 'description'
    | 'isActive'
    | 'status'
    | 'eligibilityRules'
    | 'createdAt'
    | 'updatedAt'
    | 'resultsPublished'
    | 'resultsPublishedAt'
    | 'preliminaryResultsPublished'
    | 'preliminaryResultsPublishedAt'
  > {}

class Election
  extends Model<ElectionAttributes, ElectionCreationAttributes>
  implements ElectionAttributes
{
  declare id: string;
  declare electionName: string;
  declare electionType: string;
  declare startDate: Date;
  declare endDate: Date;
  declare description: string | null;
  declare isActive: boolean;
  declare status: ElectionStatus;
  declare eligibilityRules: any | null;
  declare createdBy: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
  public resultsPublished?: boolean;
  public resultsPublishedAt?: Date;
  public preliminaryResultsPublished?: boolean;
  public preliminaryResultsPublishedAt?: Date;
  public publicKeyFingerprint?: string;

  public candidates?: Candidate[];
  public votes?: Vote[];
  public stats?: ElectionStats;
  public creator?: AdminUser;

  public static associate(models: any): void {
    Election.hasMany(models.Candidate, {
      foreignKey: 'electionId',
      sourceKey: 'id',
      as: 'candidates',
    });

    Election.hasMany(models.Vote, {
      foreignKey: 'electionId',
      sourceKey: 'id',
      as: 'votes',
    });

    Election.hasOne(models.ElectionStats, {
      foreignKey: 'electionId',
      sourceKey: 'id',
      as: 'stats',
    });

    Election.belongsTo(models.AdminUser, {
      foreignKey: 'createdBy',
      targetKey: 'id',
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
            isAfterStartDate(this: Election, value: Date) {
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
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE',
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
        resultsPublished: {
          type: DataTypes.BOOLEAN,
          field: 'results_published',
          allowNull: true,
          defaultValue: false,
        },
        resultsPublishedAt: {
          type: DataTypes.DATE,
          field: 'results_published_at',
          allowNull: true,
        },
        preliminaryResultsPublished: {
          type: DataTypes.BOOLEAN,
          field: 'preliminary_results_published',
          allowNull: true,
          defaultValue: false,
        },
        preliminaryResultsPublishedAt: {
          type: DataTypes.DATE,
          field: 'preliminary_results_published_at',
          allowNull: true,
        },
        publicKeyFingerprint: {
          type: DataTypes.STRING(16),
          field: 'public_key_fingerprint',
          allowNull: true,
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
          beforeCreate: (election: Election) => {
            if (election.startDate >= election.endDate) {
              throw new Error('End date must be after start date');
            }
          },
          beforeUpdate: (election: Election) => {
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
