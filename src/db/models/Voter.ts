import { Model, DataTypes, Sequelize, Optional } from 'sequelize';
import bcrypt from 'bcrypt';

interface VoterAttributes {
  id: string;
  nin: string;
  vin: string;
  phoneNumber: string;
  dateOfBirth: Date;
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
  > {
  password: string;
}

class Voter extends Model<VoterAttributes, VoterCreationAttributes> implements VoterAttributes {
  public id!: string;
  public nin!: string;
  public vin!: string;
  public phoneNumber!: string;
  public dateOfBirth!: Date;
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

  // Timestamps
  public static readonly createdAt = 'createdAt';
  public static readonly updatedAt = 'updatedAt';

  // Method to validate password
  public async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.passwordHash);
  }

  // Method to update password
  public async updatePassword(password: string): Promise<void> {
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);
    this.passwordHash = await bcrypt.hash(password, saltRounds);
    await this.save();
  }

  // Model associations
  public static associate(models: any): void {
    Voter.hasOne(models.VoterCard, {
      foreignKey: 'user_id',
      as: 'voter_card',
    });

    Voter.hasOne(models.VerificationStatus, {
      foreignKey: 'user_id',
      as: 'verification_status',
    });

    Voter.hasMany(models.Vote, {
      foreignKey: 'user_id',
      as: 'votes',
    });

    Voter.hasMany(models.AuditLog, {
      foreignKey: 'user_id',
      as: 'audit_logs',
    });

    Voter.hasMany(models.FailedAttempt, {
      foreignKey: 'user_id',
      as: 'failed_attempts',
    });

    Voter.hasMany(models.UssdSession, {
      foreignKey: 'user_id',
      as: 'ussd_sessions',
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
      },
      {
        sequelize,
        modelName: 'Voter',
        tableName: 'voters',
        underscored: false,
        timestamps: true,
        indexes: [
          { unique: true, fields: ['nin'] },
          { unique: true, fields: ['vin'] },
          { fields: ['phone_number'] },
        ],
        hooks: {
          beforeCreate: async (voter: Voter & { password?: string }) => {
            if (voter.password) {
              const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);
              voter.passwordHash = await bcrypt.hash(voter.password, saltRounds);
              delete voter.password; // Remove plain text password
            }
          },
          beforeUpdate: async (voter: Voter & { password?: string }) => {
            if (voter.password) {
              const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);
              voter.passwordHash = await bcrypt.hash(voter.password, saltRounds);
              delete voter.password; // Remove plain text password
            }
          },
        },
      },
    );
  }
}

export default Voter;
