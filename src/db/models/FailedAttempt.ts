import { Model, DataTypes, Sequelize, Optional } from 'sequelize';

// Attempt type enum
export enum AttemptType {
  LOGIN = 'login',
  PASSWORD_RESET = 'password_reset',
  MFA = 'mfa',
  USSD_AUTH = 'ussd_auth',
  MOBILE_LOGIN = 'mobile_login',
}

interface FailedAttemptAttributes {
  id: string;
  userId: string;
  attemptType: string;
  ipAddress: string | null;
  userAgent: string | null;
  attemptTime: Date;
}

interface FailedAttemptCreationAttributes
  extends Optional<FailedAttemptAttributes, 'id' | 'ipAddress' | 'userAgent' | 'attemptTime'> {}

class FailedAttempt
  extends Model<FailedAttemptAttributes, FailedAttemptCreationAttributes>
  implements FailedAttemptAttributes
{
  declare id: string;
  declare userId: string;
  declare attemptType: string;
  declare ipAddress: string | null;
  declare userAgent: string | null;
  declare attemptTime: Date;

  // Model associations
  public static associate(models: any): void {
    FailedAttempt.belongsTo(models.Voter, {
      foreignKey: 'user_id',
      as: 'voter',
    });
  }

  public static initialize(sequelize: Sequelize): typeof FailedAttempt {
    return FailedAttempt.init(
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
        attemptType: {
          type: DataTypes.STRING(50),
          allowNull: false,
          field: 'attempt_type',
          validate: {
            isIn: [Object.values(AttemptType)],
          },
        },
        ipAddress: {
          type: DataTypes.STRING(50),
          allowNull: true,
          field: 'ip_address',
        },
        userAgent: {
          type: DataTypes.TEXT,
          allowNull: true,
          field: 'user_agent',
        },
        attemptTime: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
          field: 'attempt_time',
        },
      },
      {
        sequelize,
        modelName: 'FailedAttempt',
        tableName: 'failed_attempts',
        timestamps: false,
      },
    );
  }
}

export default FailedAttempt;
