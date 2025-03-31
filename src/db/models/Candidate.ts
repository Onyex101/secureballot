import { Model, DataTypes, Sequelize, Optional } from 'sequelize';
// Remove sequelize-typescript imports
// import { Table, Column, BelongsTo, ForeignKey, AllowNull, Comment } from 'sequelize-typescript';
import Election from './Election';
import Vote from './Vote';

// Candidate status enum
export enum CandidateStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  DISQUALIFIED = 'disqualified',
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
    | 'id'
    | 'bio'
    | 'photoUrl'
    | 'position'
    | 'manifesto'
    | 'status'
    | 'isActive'
    | 'createdAt'
    | 'updatedAt'
  > {}

// Remove @Table decorator
class Candidate
  extends Model<CandidateAttributes, CandidateCreationAttributes>
  implements CandidateAttributes
{
  // Remove decorators
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

  // Associations (defined in associate method)
  public election?: Election;
  public votes?: Vote[];

  // Re-add static associate method
  public static associate(models: any): void {
    Candidate.belongsTo(models.Election, {
      foreignKey: 'electionId',
      targetKey: 'id',
      as: 'election',
    });

    Candidate.hasMany(models.Vote, {
      foreignKey: 'candidateId',
      sourceKey: 'id',
      as: 'votes',
    });
  }

  // Re-add static initialize method
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
          field: 'election_id',
          references: {
            model: 'elections',
            key: 'id',
          },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        fullName: {
          type: DataTypes.STRING(100),
          allowNull: false,
          field: 'full_name',
          validate: {
            notEmpty: true,
          },
        },
        partyCode: {
          type: DataTypes.STRING(50),
          allowNull: false,
          field: 'party_code',
          validate: {
            notEmpty: true,
          },
        },
        partyName: {
          type: DataTypes.STRING(100),
          field: 'party_name',
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
          type: DataTypes.TEXT,
          field: 'photo_url',
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
          field: 'is_active',
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
        modelName: 'Candidate',
        tableName: 'candidates',
        underscored: false, // Use false if field names in init are camelCase
        timestamps: true,
        indexes: [
          { fields: ['election_id'] },
          { fields: ['party_code'] },
          { fields: ['status'] },
          { fields: ['is_active'] },
          { unique: true, fields: ['election_id', 'party_code'] }, // Matches SQL constraint
        ],
        hooks: {
          beforeUpdate: (candidate: Candidate) => {
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
