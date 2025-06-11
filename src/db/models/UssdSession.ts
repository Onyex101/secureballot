import { Model, DataTypes, Sequelize, Optional } from 'sequelize';

// USSD session status enum
export enum UssdSessionStatus {
  CREATED = 'created',
  AUTHENTICATED = 'authenticated',
  ELECTION_SELECTED = 'election_selected',
  CANDIDATE_SELECTED = 'candidate_selected',
  VOTE_CONFIRMED = 'vote_confirmed',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
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
    'id' | 'userId' | 'sessionData' | 'isActive' | 'lastActivity' | 'createdAt' | 'updatedAt'
  > {}

class UssdSession
  extends Model<UssdSessionAttributes, UssdSessionCreationAttributes>
  implements UssdSessionAttributes
{
  declare id: string;
  declare userId: string | null;
  declare sessionCode: string;
  declare phoneNumber: string;
  declare sessionData: any | null;
  declare createdAt: Date;
  declare expiresAt: Date;
  declare isActive: boolean;
  declare sessionStatus: UssdSessionStatus;
  declare lastActivity: Date;
  declare readonly updatedAt: Date;

  // Timestamps
  public static readonly createdAt = 'createdAt';
  public static readonly updatedAt = 'updatedAt';

  // Model associations
  public static associate(models: any): void {
    UssdSession.belongsTo(models.Voter, {
      foreignKey: 'user_id',
      as: 'voter',
    });

    UssdSession.hasMany(models.UssdVote, {
      foreignKey: 'session_code',
      sourceKey: 'sessionCode',
      as: 'votes',
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
          field: 'user_id',
          references: {
            model: 'voters',
            key: 'id',
          },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        sessionCode: {
          type: DataTypes.STRING(10),
          allowNull: false,
          unique: true,
          field: 'session_code',
          validate: {
            notEmpty: true,
          },
        },
        phoneNumber: {
          type: DataTypes.STRING(15),
          allowNull: false,
          field: 'phone_number',
          validate: {
            is: /^\+?[0-9]{10,15}$/,
            notEmpty: true,
          },
        },
        sessionData: {
          type: DataTypes.JSONB,
          allowNull: true,
          field: 'session_data',
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
          field: 'created_at',
        },
        expiresAt: {
          type: DataTypes.DATE,
          allowNull: false,
          field: 'expires_at',
        },
        isActive: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
          field: 'is_active',
        },
        sessionStatus: {
          type: DataTypes.STRING(50),
          allowNull: false,
          defaultValue: UssdSessionStatus.CREATED,
          field: 'session_status',
          validate: {
            isIn: [Object.values(UssdSessionStatus)],
          },
        },
        lastActivity: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
          field: 'last_activity',
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
        modelName: 'UssdSession',
        tableName: 'ussd_sessions',
        underscored: false,
        timestamps: true,
        indexes: [
          { unique: true, fields: ['session_code'] },
          { fields: ['phone_number'] },
          { fields: ['user_id'] },
          { fields: ['is_active'] },
          { fields: ['session_status'] },
          { fields: ['expires_at'] },
        ],
        hooks: {
          beforeCreate: (session: UssdSession) => {
            // Set expiration date to 15 minutes from now by default
            const expiry = new Date();
            expiry.setMinutes(expiry.getMinutes() + 15);
            session.expiresAt = expiry;
          },
          beforeUpdate: (session: UssdSession) => {
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
