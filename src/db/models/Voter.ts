import { Model, DataTypes, Sequelize, Optional } from 'sequelize';
import bcrypt from 'bcrypt';

interface VoterAttributes {
  id: string;
  nin: string;
  vin: string;
  phoneNumber: string;
  dateOfBirth: Date;
  fullName: string;
  pollingUnitCode: string;
  state: string;
  gender: string;
  lga: string;
  ward: string;
  passwordHash: string;
  recoveryToken: string | null;
  recoveryTokenExpiry: Date | null;
  isActive: boolean;
  lastLogin: Date | null;
  createdAt: Date;
  updatedAt: Date;
  mfaSecret: string | null;
  mfaEnabled: boolean;
  mfaBackupCodes: string[] | null;
  publicKey?: string;
}

interface VoterCreationAttributes
  extends Optional<
    VoterAttributes,
    | 'id'
    | 'recoveryToken'
    | 'recoveryTokenExpiry'
    | 'isActive'
    | 'lastLogin'
    | 'createdAt'
    | 'updatedAt'
    | 'mfaSecret'
    | 'mfaEnabled'
    | 'mfaBackupCodes'
    | 'publicKey'
  > {
  password: string;
}

class Voter extends Model<VoterAttributes, VoterCreationAttributes> implements VoterAttributes {
  public id!: string;
  public nin!: string;
  public vin!: string;
  public phoneNumber!: string;
  public dateOfBirth!: Date;
  public fullName!: string;
  public pollingUnitCode!: string;
  public state!: string;
  public gender!: string;
  public lga!: string;
  public ward!: string;
  public passwordHash!: string;
  public recoveryToken!: string | null;
  public recoveryTokenExpiry!: Date | null;
  public isActive!: boolean;
  public lastLogin!: Date | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public mfaSecret!: string | null;
  public mfaEnabled!: boolean;
  public mfaBackupCodes!: string[] | null;
  public publicKey?: string;

  public static readonly createdAt = 'createdAt';
  public static readonly updatedAt = 'updatedAt';

  public password?: string;

  public validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.passwordHash);
  }

  public static associate(models: any): void {
    Voter.hasOne(models.VerificationStatus, {
      foreignKey: 'userId',
      as: 'verificationStatus',
    });

    Voter.belongsTo(models.PollingUnit, {
      foreignKey: 'polling_unit_code',
      targetKey: 'pollingUnitCode',
      as: 'pollingUnit',
    });

    Voter.hasMany(models.Vote, {
      foreignKey: 'userId',
      sourceKey: 'id',
      as: 'votes',
    });

    Voter.hasMany(models.AuditLog, {
      foreignKey: 'userId',
      sourceKey: 'id',
      as: 'auditLogs',
    });

    Voter.hasMany(models.FailedAttempt, {
      foreignKey: 'userId',
      sourceKey: 'id',
      as: 'failedAttempts',
    });

    Voter.hasMany(models.UssdSession, {
      foreignKey: 'userId',
      sourceKey: 'id',
      as: 'ussdSessions',
    });
  }

  public static initialize(sequelize: Sequelize): typeof Voter {
    return Voter.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        nin: {
          type: DataTypes.STRING(11),
          allowNull: false,
          unique: true,
          validate: {
            len: [11, 11],
            notEmpty: true,
          },
        },
        vin: {
          type: DataTypes.STRING(19),
          allowNull: false,
          unique: true,
          validate: {
            len: [19, 19],
            notEmpty: true,
          },
        },
        phoneNumber: {
          field: 'phone_number',
          type: DataTypes.STRING(15),
          allowNull: false,
          validate: {
            is: /^\+?[0-9]{10,15}$/,
            notEmpty: true,
          },
        },
        dateOfBirth: {
          field: 'date_of_birth',
          type: DataTypes.DATEONLY,
          allowNull: false,
        },
        fullName: {
          field: 'full_name',
          type: DataTypes.STRING(100),
          allowNull: false,
          validate: {
            notEmpty: true,
          },
        },
        pollingUnitCode: {
          field: 'polling_unit_code',
          type: DataTypes.STRING(50),
          allowNull: false,
          validate: {
            notEmpty: true,
          },
        },
        state: {
          type: DataTypes.STRING(50),
          allowNull: false,
          validate: {
            notEmpty: true,
          },
        },
        gender: {
          type: DataTypes.STRING,
          allowNull: false,
          defaultValue: 'male',
          validate: {
            isIn: [['male', 'female']],
          },
        },
        lga: {
          type: DataTypes.STRING(50),
          allowNull: false,
          validate: {
            notEmpty: true,
          },
        },
        ward: {
          type: DataTypes.STRING(100),
          allowNull: false,
          validate: {
            notEmpty: true,
          },
        },
        passwordHash: {
          field: 'password_hash',
          type: DataTypes.STRING,
          allowNull: false,
        },
        recoveryToken: {
          field: 'recovery_token',
          type: DataTypes.STRING,
          allowNull: true,
        },
        recoveryTokenExpiry: {
          field: 'recovery_token_expiry',
          type: DataTypes.DATE,
          allowNull: true,
        },
        isActive: {
          field: 'is_active',
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        lastLogin: {
          field: 'last_login',
          type: DataTypes.DATE,
          allowNull: true,
        },
        createdAt: {
          field: 'created_at',
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        updatedAt: {
          field: 'updated_at',
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        mfaSecret: {
          field: 'mfa_secret',
          type: DataTypes.STRING,
          allowNull: true,
        },
        mfaEnabled: {
          field: 'mfa_enabled',
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        mfaBackupCodes: {
          field: 'mfa_backup_codes',
          type: DataTypes.ARRAY(DataTypes.STRING),
          allowNull: true,
        },
        publicKey: {
          field: 'public_key',
          type: DataTypes.TEXT,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: 'Voter',
        tableName: 'voters',
        underscored: true,
        timestamps: true,
        indexes: [
          { unique: true, fields: ['nin'] },
          { unique: true, fields: ['vin'] },
          { fields: ['phone_number'] },
          { fields: ['polling_unit_code'] },
          { fields: ['state', 'lga', 'ward'] },
        ],
        hooks: {
          beforeCreate: async (voter: Voter) => {
            if (voter.password) {
              const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);
              voter.passwordHash = await bcrypt.hash(voter.password, saltRounds);
              voter.password = undefined;
            }
          },
          beforeUpdate: async (voter: Voter) => {
            if (voter.password && voter.changed('passwordHash') === false) {
              const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);
              voter.passwordHash = await bcrypt.hash(voter.password, saltRounds);
              voter.password = undefined;
            }
          },
        },
      },
    );
  }
}

export default Voter;
