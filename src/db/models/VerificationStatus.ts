import { Model, DataTypes, Sequelize, Optional } from 'sequelize';

interface VerificationStatusAttributes {
  id: string;
  userId: string;
  state: string;
  isVerified: boolean;
  verifiedAt: Date | null;
  verificationMethod: string | null;
  verificationNotes: string | null;
  verificationData: any | null;
  createdAt: Date;
  updatedAt: Date;
}

interface VerificationStatusCreationAttributes
  extends Optional<
    VerificationStatusAttributes,
    | 'id'
    | 'isVerified'
    | 'verifiedAt'
    | 'verificationMethod'
    | 'verificationNotes'
    | 'verificationData'
    | 'createdAt'
    | 'updatedAt'
  > {}

class VerificationStatus
  extends Model<VerificationStatusAttributes, VerificationStatusCreationAttributes>
  implements VerificationStatusAttributes
{
  public id!: string;
  public userId!: string;
  public state!: string;
  public isVerified!: boolean;
  public verifiedAt!: Date | null;
  public verificationMethod!: string | null;
  public verificationNotes!: string | null;
  public verificationData!: any | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Timestamps
  public static readonly createdAt = 'createdAt';
  public static readonly updatedAt = 'updatedAt';

  // Model associations
  public static associate(models: any): void {
    VerificationStatus.belongsTo(models.Voter, {
      foreignKey: 'user_id',
      as: 'voter',
    });
  }

  public static initialize(sequelize: Sequelize): typeof VerificationStatus {
    return VerificationStatus.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: false,
          field: 'user_id',
          references: {
            model: 'voters',
            key: 'id',
          },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        state: {
          type: DataTypes.STRING(50),
          allowNull: false,
          validate: {
            notEmpty: true,
          },
        },
        isVerified: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          field: 'is_verified',
        },
        verifiedAt: {
          type: DataTypes.DATE,
          allowNull: true,
          field: 'verified_at',
        },
        verificationMethod: {
          type: DataTypes.STRING(100),
          allowNull: true,
          field: 'verification_method',
        },
        verificationNotes: {
          type: DataTypes.TEXT,
          allowNull: true,
          field: 'verification_notes',
        },
        verificationData: {
          type: DataTypes.JSON,
          allowNull: true,
          field: 'verification_data',
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
        modelName: 'VerificationStatus',
        tableName: 'verification_status',
        underscored: false,
        timestamps: true,
        indexes: [
          { unique: true, fields: ['user_id'] },
          { fields: ['state'] },
          { fields: ['is_verified'] },
        ],
        hooks: {
          beforeUpdate: async (verificationStatus: VerificationStatus) => {
            // If status is changing to verified, set the verification time
            if (verificationStatus.changed('isVerified') && verificationStatus.isVerified) {
              verificationStatus.verifiedAt = new Date();
            }
          },
        },
      },
    );
  }
}

export default VerificationStatus;
