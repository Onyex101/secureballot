import { Model, DataTypes, Sequelize, Optional } from 'sequelize';
import { encryptIdentity, decryptIdentity } from '../../services/encryptionService';

interface VoterAttributes {
  id: string;
  phoneNumber: string;
  dateOfBirth: Date;
  fullName: string;
  pollingUnitCode: string;
  state: string;
  gender: string;
  lga: string;
  ward: string;
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
  ninEncrypted: string | null;
  vinEncrypted: string | null;
  email: string | null;
  otpCode: string | null;
  otpExpiresAt: Date | null;
  otpVerified: boolean;
  // Virtual fields for temporary nin and vin values
  nin?: string;
  vin?: string;
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
    | 'ninEncrypted'
    | 'vinEncrypted'
    | 'email'
    | 'otpCode'
    | 'otpExpiresAt'
    | 'otpVerified'
  > {
  nin: string; // Virtual field for input
  vin: string; // Virtual field for input
}

class Voter extends Model<VoterAttributes, VoterCreationAttributes> implements VoterAttributes {
  // Use declare to inform TypeScript without creating fields that shadow Sequelize getters
  declare id: string;
  declare phoneNumber: string;
  declare dateOfBirth: Date;
  declare fullName: string;
  declare pollingUnitCode: string;
  declare state: string;
  declare gender: string;
  declare lga: string;
  declare ward: string;
  declare recoveryToken: string | null;
  declare recoveryTokenExpiry: Date | null;
  declare isActive: boolean;
  declare lastLogin: Date | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
  declare mfaSecret: string | null;
  declare mfaEnabled: boolean;
  declare mfaBackupCodes: string[] | null;
  declare publicKey?: string;
  declare ninEncrypted: string | null;
  declare vinEncrypted: string | null;
  declare email: string | null;
  declare otpCode: string | null;
  declare otpExpiresAt: Date | null;
  declare otpVerified: boolean;

  public static readonly createdAt = 'createdAt';
  public static readonly updatedAt = 'updatedAt';

  // Virtual properties for input (these don't shadow database fields)
  public nin?: string;
  public vin?: string;

  // Getter methods to decrypt values when accessed
  public get decryptedNin(): string | null {
    if (!this.ninEncrypted) return null;
    try {
      return decryptIdentity(this.ninEncrypted);
    } catch (error) {
      return null;
    }
  }

  public get decryptedVin(): string | null {
    if (!this.vinEncrypted) return null;
    try {
      return decryptIdentity(this.vinEncrypted);
    } catch (error) {
      return null;
    }
  }

  public static associate(models: any): void {
    Voter.hasOne(models.VerificationStatus, {
      foreignKey: 'user_id',
      as: 'verificationStatus',
    });

    Voter.belongsTo(models.PollingUnit, {
      foreignKey: 'polling_unit_code',
      targetKey: 'pollingUnitCode',
      as: 'pollingUnit',
    });

    Voter.hasMany(models.Vote, {
      foreignKey: 'user_id',
      sourceKey: 'id',
      as: 'votes',
    });

    Voter.hasMany(models.AuditLog, {
      foreignKey: 'user_id',
      sourceKey: 'id',
      as: 'auditLogs',
    });

    Voter.hasMany(models.FailedAttempt, {
      foreignKey: 'user_id',
      sourceKey: 'id',
      as: 'failedAttempts',
    });

    Voter.hasMany(models.UssdSession, {
      foreignKey: 'user_id',
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
        ninEncrypted: {
          field: 'nin_encrypted',
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        vinEncrypted: {
          field: 'vin_encrypted',
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        email: {
          type: DataTypes.STRING(100),
          allowNull: true,
          validate: {
            isEmail: true,
          },
        },
        otpCode: {
          field: 'otp_code',
          type: DataTypes.STRING(6),
          allowNull: true,
        },
        otpExpiresAt: {
          field: 'otp_expires_at',
          type: DataTypes.DATE,
          allowNull: true,
        },
        otpVerified: {
          field: 'otp_verified',
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        // Virtual fields for temporary nin and vin values
        nin: {
          type: DataTypes.VIRTUAL,
          allowNull: true,
        },
        vin: {
          type: DataTypes.VIRTUAL,
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
          { unique: true, fields: ['nin_encrypted'] },
          { unique: true, fields: ['vin_encrypted'] },
          { fields: ['phone_number'] },
          { fields: ['polling_unit_code'] },
          { fields: ['state', 'lga', 'ward'] },
        ],
        hooks: {
          beforeCreate: (voter: Voter) => {
            // Encrypt nin and vin before creation
            if (voter.nin) {
              voter.ninEncrypted = encryptIdentity(voter.nin);
              delete voter.nin; // Remove virtual field after encryption
            }

            if (voter.vin) {
              voter.vinEncrypted = encryptIdentity(voter.vin);
              delete voter.vin; // Remove virtual field after encryption
            }
          },
          beforeUpdate: (voter: Voter) => {
            // Encrypt nin and vin on update if they are provided
            if (voter.nin) {
              voter.ninEncrypted = encryptIdentity(voter.nin);
              delete voter.nin; // Remove virtual field after encryption
            }

            if (voter.vin) {
              voter.vinEncrypted = encryptIdentity(voter.vin);
              delete voter.vin; // Remove virtual field after encryption
            }
          },
          afterFind: (result: Voter | Voter[] | null) => {
            // Decrypt nin and vin after finding voter(s)
            if (!result) return;

            const voters = Array.isArray(result) ? result : [result];

            voters.forEach((voter: Voter) => {
              if (voter.ninEncrypted) {
                try {
                  voter.nin = decryptIdentity(voter.ninEncrypted);
                } catch (error) {
                  voter.nin = undefined;
                }
              }

              if (voter.vinEncrypted) {
                try {
                  voter.vin = decryptIdentity(voter.vinEncrypted);
                } catch (error) {
                  voter.vin = undefined;
                }
              }
            });
          },
        },
      },
    );
  }
}

export default Voter;
