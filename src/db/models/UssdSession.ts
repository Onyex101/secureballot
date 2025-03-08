import { Model, DataTypes, Sequelize, Optional } from "sequelize";

// USSD session status enum
export enum UssdSessionStatus {
  CREATED = "created",
  AUTHENTICATED = "authenticated",
  ELECTION_SELECTED = "election_selected",
  CANDIDATE_SELECTED = "candidate_selected",
  VOTE_CONFIRMED = "vote_confirmed",
  COMPLETED = "completed",
  EXPIRED = "expired",
  CANCELLED = "cancelled",
}

interface UssdSessionAttributes {
  id: string;
  userId: string | null;
  sessionCode: string;
  phoneNumber: string;
  sessionData: any | null;
  createdAt: Date;
  expiresAt: Date;
  isActive: boolean;
  sessionStatus: UssdSessionStatus;
  lastActivity: Date;
  updatedAt: Date;
}

interface UssdSessionCreationAttributes
  extends Optional<
    UssdSessionAttributes,
    | "id"
    | "userId"
    | "sessionData"
    | "isActive"
    | "lastActivity"
    | "createdAt"
    | "updatedAt"
  > {}

class UssdSession
  extends Model<UssdSessionAttributes, UssdSessionCreationAttributes>
  implements UssdSessionAttributes
{
  public id!: string;
  public userId!: string | null;
  public sessionCode!: string;
  public phoneNumber!: string;
  public sessionData!: any | null;
  public createdAt!: Date;
  public expiresAt!: Date;
  public isActive!: boolean;
  public sessionStatus!: UssdSessionStatus;
  public lastActivity!: Date;
  public readonly updatedAt!: Date;

  // Timestamps
  public static readonly createdAt = "createdAt";
  public static readonly updatedAt = "updatedAt";

  // Model associations
  public static associate(models: any): void {
    UssdSession.belongsTo(models.Voter, {
      foreignKey: "userId",
      as: "voter",
    });

    UssdSession.hasMany(models.UssdVote, {
      foreignKey: "sessionId",
      as: "votes",
    });
  }

  public static initialize(sequelize: Sequelize): typeof UssdSession {
    return UssdSession.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: true,
          references: {
            model: "voters",
            key: "id",
          },
          onDelete: "CASCADE",
          onUpdate: "CASCADE",
        },
        sessionCode: {
          type: DataTypes.STRING(10),
          allowNull: false,
          unique: true,
          validate: {
            notEmpty: true,
          },
        },
        phoneNumber: {
          type: DataTypes.STRING(15),
          allowNull: false,
          validate: {
            is: /^\+?[0-9]{10,15}$/,
            notEmpty: true,
          },
        },
        sessionData: {
          type: DataTypes.JSONB,
          allowNull: true,
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        expiresAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        isActive: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        sessionStatus: {
          type: DataTypes.STRING(50),
          allowNull: false,
          defaultValue: UssdSessionStatus.CREATED,
          validate: {
            isIn: [Object.values(UssdSessionStatus)],
          },
        },
        lastActivity: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize,
        modelName: "UssdSession",
        tableName: "ussd_sessions",
        underscored: false,
        timestamps: true,
        indexes: [
          { unique: true, fields: ["sessionCode"] },
          { fields: ["phoneNumber"] },
          { fields: ["userId"] },
          { fields: ["isActive"] },
          { fields: ["sessionStatus"] },
          { fields: ["expiresAt"] },
        ],
        hooks: {
          beforeCreate: async (session: UssdSession) => {
            // Set expiration date to 15 minutes from now by default
            const expiry = new Date();
            expiry.setMinutes(expiry.getMinutes() + 15);
            session.expiresAt = expiry;
          },
          beforeUpdate: async (session: UssdSession) => {
            // Update lastActivity timestamp on each update
            session.lastActivity = new Date();

            // Check if session is expired
            if (new Date() > session.expiresAt && session.isActive) {
              session.isActive = false;
              session.sessionStatus = UssdSessionStatus.EXPIRED;
            }
          },
        },
      },
    );
  }
}

export default UssdSession;
