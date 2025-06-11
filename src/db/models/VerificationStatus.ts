import { Model, DataTypes, Sequelize, Optional } from 'sequelize';

interface VerificationStatusAttributes {
  id: string;
  userId: string;
  isPhoneVerified: boolean;
  isEmailVerified: boolean;
  isIdentityVerified: boolean;
  isAddressVerified: boolean;
  isBiometricVerified: boolean;
  verificationLevel: number;
  lastVerifiedAt: Date | null;
  isVerified: boolean;
  state: string;
  verifiedAt: Date | null;
  verificationMethod: string;
  verificationData: any;
  createdAt: Date;
  updatedAt: Date;
}

interface VerificationStatusCreationAttributes
  extends Optional<
    VerificationStatusAttributes,
    | 'id'
    | 'isPhoneVerified'
    | 'isEmailVerified'
    | 'isIdentityVerified'
    | 'isAddressVerified'
    | 'isBiometricVerified'
    | 'verificationLevel'
    | 'lastVerifiedAt'
    | 'isVerified'
    | 'state'
    | 'verifiedAt'
    | 'verificationMethod'
    | 'verificationData'
    | 'createdAt'
    | 'updatedAt'
  > {}

class VerificationStatus
  extends Model<VerificationStatusAttributes, VerificationStatusCreationAttributes>
  implements VerificationStatusAttributes
{
  declare id: string;
  declare userId: string;
  declare isPhoneVerified: boolean;
  declare isEmailVerified: boolean;
  declare isIdentityVerified: boolean;
  declare isAddressVerified: boolean;
  declare isBiometricVerified: boolean;
  declare verificationLevel: number;
  declare lastVerifiedAt: Date | null;
  declare isVerified: boolean;
  declare state: string;
  declare verifiedAt: Date | null;
  declare verificationMethod: string;
  declare verificationData: any;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

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
          unique: true,
          references: {
            model: 'voters',
            key: 'id',
          },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        isPhoneVerified: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          field: 'is_phone_verified',
        },
        isEmailVerified: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          field: 'is_email_verified',
        },
        isIdentityVerified: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          field: 'is_identity_verified',
        },
        isAddressVerified: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          field: 'is_address_verified',
        },
        isBiometricVerified: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          field: 'is_biometric_verified',
        },
        verificationLevel: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          field: 'verification_level',
        },
        lastVerifiedAt: {
          type: DataTypes.DATE,
          allowNull: true,
          field: 'last_verified_at',
        },
        isVerified: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          field: 'is_verified',
        },
        state: {
          type: DataTypes.STRING,
          allowNull: false,
          field: 'state',
        },
        verifiedAt: {
          type: DataTypes.DATE,
          allowNull: true,
          field: 'verified_at',
        },
        verificationMethod: {
          type: DataTypes.STRING,
          allowNull: false,
          field: 'verification_method',
        },
        verificationData: {
          type: DataTypes.JSON,
          allowNull: false,
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
        tableName: 'verification_statuses',
        underscored: false,
        timestamps: true,
        indexes: [{ unique: true, fields: ['user_id'] }],
      },
    );
  }
}

export default VerificationStatus;
