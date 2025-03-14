import { Model, DataTypes, Sequelize, Optional } from "sequelize";

// Attempt type enum
export enum AttemptType {
  LOGIN = "login",
  PASSWORD_RESET = "password_reset",
  MFA = "mfa",
  USSD_AUTH = "ussd_auth",
  MOBILE_LOGIN = "mobile_login",
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
  extends Optional<
    FailedAttemptAttributes,
    "id" | "ipAddress" | "userAgent" | "attemptTime"
  > {}

class FailedAttempt
  extends Model<FailedAttemptAttributes, FailedAttemptCreationAttributes>
  implements FailedAttemptAttributes
{
  public id!: string;
  public userId!: string;
  public attemptType!: string;
  public ipAddress!: string | null;
  public userAgent!: string | null;
  public attemptTime!: Date;

  // Model associations
  public static associate(models: any): void {
    FailedAttempt.belongsTo(models.Voter, {
      foreignKey: "userId",
      as: "voter",
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
          references: {
            model: "voters",
            key: "id",
          },
        },
        attemptType: {
          type: DataTypes.STRING(50),
          allowNull: false,
          validate: {
            isIn: [Object.values(AttemptType)],
          },
        },
        ipAddress: {
          type: DataTypes.STRING(50),
          allowNull: true,
        },
        userAgent: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        attemptTime: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize,
        modelName: "FailedAttempt",
        tableName: "failed_attempts",
        timestamps: false,
      }
    );
  }
}

export default FailedAttempt; 