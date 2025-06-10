import { Model, DataTypes, Sequelize, Optional } from 'sequelize';

export enum OtpStatus {
  SENT = 'sent',
  VERIFIED = 'verified',
  EXPIRED = 'expired',
  FAILED = 'failed',
}

interface OtpLogAttributes {
  id: string;
  userId: string;
  otpCode: string;
  email: string;
  ipAddress: string | null;
  userAgent: string | null;
  status: OtpStatus;
  attempts: number;
  expiresAt: Date;
  verifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface OtpLogCreationAttributes
  extends Optional<
    OtpLogAttributes,
    'id' | 'status' | 'attempts' | 'verifiedAt' | 'createdAt' | 'updatedAt'
  > {}

class OtpLog extends Model<OtpLogAttributes, OtpLogCreationAttributes> implements OtpLogAttributes {
  public id!: string;
  public userId!: string;
  public otpCode!: string;
  public email!: string;
  public ipAddress!: string | null;
  public userAgent!: string | null;
  public status!: OtpStatus;
  public attempts!: number;
  public expiresAt!: Date;
  public verifiedAt!: Date | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public static readonly createdAt = 'createdAt';
  public static readonly updatedAt = 'updatedAt';

  public static associate(models: any): void {
    OtpLog.belongsTo(models.Voter, {
      foreignKey: 'user_id',
      as: 'voter',
    });
  }

  public static initialize(sequelize: Sequelize): typeof OtpLog {
    return OtpLog.init(
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
        },
        otpCode: {
          type: DataTypes.STRING(6),
          allowNull: false,
          field: 'otp_code',
        },
        email: {
          type: DataTypes.STRING(100),
          allowNull: false,
          validate: {
            isEmail: true,
          },
        },
        ipAddress: {
          type: DataTypes.INET,
          allowNull: true,
          field: 'ip_address',
        },
        userAgent: {
          type: DataTypes.TEXT,
          allowNull: true,
          field: 'user_agent',
        },
        status: {
          type: DataTypes.ENUM(...Object.values(OtpStatus)),
          allowNull: false,
          defaultValue: OtpStatus.SENT,
        },
        attempts: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        expiresAt: {
          type: DataTypes.DATE,
          allowNull: false,
          field: 'expires_at',
        },
        verifiedAt: {
          type: DataTypes.DATE,
          allowNull: true,
          field: 'verified_at',
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
        tableName: 'otp_logs',
        timestamps: true,
        underscored: true,
        indexes: [
          {
            fields: ['user_id'],
            name: 'idx_otp_logs_user_id',
          },
          {
            fields: ['status'],
            name: 'idx_otp_logs_status',
          },
          {
            fields: ['created_at'],
            name: 'idx_otp_logs_created_at',
          },
        ],
      },
    );
  }
}

export default OtpLog;
