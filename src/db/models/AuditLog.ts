import { Model, DataTypes, Sequelize, Optional } from 'sequelize';

// Audit action types
export enum AuditActionType {
  LOGIN = 'login',
  LOGOUT = 'logout',
  REGISTRATION = 'registration',
  VERIFICATION = 'verification',
  PASSWORD_RESET = 'password_reset',
  PASSWORD_CHANGE = 'password_change',
  VOTE_CAST = 'vote_cast',
  PROFILE_UPDATE = 'profile_update',
  ELECTION_VIEW = 'election_view',
  MFA_SETUP = 'mfa_setup',
  MFA_VERIFY = 'mfa_verify',
  USSD_SESSION = 'ussd_session',
}

interface AuditLogAttributes {
  id: string;
  userId: string | null;
  actionType: string;
  actionTimestamp: Date;
  ipAddress: string;
  userAgent: string;
  actionDetails: any | null;
  isSuspicious: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface AuditLogCreationAttributes
  extends Optional<
    AuditLogAttributes,
    'id' | 'actionTimestamp' | 'actionDetails' | 'isSuspicious' | 'createdAt' | 'updatedAt'
  > {}

class AuditLog
  extends Model<AuditLogAttributes, AuditLogCreationAttributes>
  implements AuditLogAttributes
{
  public id!: string;
  public userId!: string | null;
  public actionType!: string;
  public actionTimestamp!: Date;
  public ipAddress!: string;
  public userAgent!: string;
  public actionDetails!: any | null;
  public isSuspicious!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Timestamps
  public static readonly createdAt = 'createdAt';
  public static readonly updatedAt = 'updatedAt';

  // Model associations
  public static associate(models: any): void {
    AuditLog.belongsTo(models.Voter, {
      foreignKey: 'user_id',
      as: 'voter',
      constraints: false,
    });
  }

  public static initialize(sequelize: Sequelize): typeof AuditLog {
    return AuditLog.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        userId: {
          type: DataTypes.UUID,
          field: 'user_id',
          allowNull: true,
        },
        actionType: {
          type: DataTypes.STRING(50),
          allowNull: false,
          field: 'action_type',
          validate: {
            notEmpty: true,
          },
        },
        actionTimestamp: {
          type: DataTypes.DATE,
          field: 'action_timestamp',
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        ipAddress: {
          type: DataTypes.STRING(255),
          allowNull: false,
          field: 'ip_address',
          validate: {
            notEmpty: true,
          },
        },
        userAgent: {
          type: DataTypes.STRING(255),
          allowNull: false,
          field: 'user_agent',
          validate: {
            notEmpty: true,
          },
        },
        actionDetails: {
          type: DataTypes.JSONB,
          allowNull: true,
          field: 'action_details',
        },
        isSuspicious: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          field: 'is_suspicious',
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
        modelName: 'AuditLog',
        tableName: 'audit_logs',
        underscored: false,
        timestamps: true,
        indexes: [
          { fields: ['user_id'] },
          { fields: ['action_type'] },
          { fields: ['action_timestamp'] },
          { fields: ['ip_address'] },
          { fields: ['is_suspicious'] },
        ],
      },
    );
  }
}

export default AuditLog;
