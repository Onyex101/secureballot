import { Model, DataTypes, Sequelize, Optional } from "sequelize";
import bcrypt from "bcrypt";

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
}

interface VoterCreationAttributes
  extends Optional<
    VoterAttributes,
    | "id"
    | "recoveryToken"
    | "recoveryTokenExpiry"
    | "isActive"
    | "lastLogin"
    | "createdAt"
    | "updatedAt"
  > {
  password: string;
}

class Voter
  extends Model<VoterAttributes, VoterCreationAttributes>
  implements VoterAttributes
{
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

  // Timestamps
  public static readonly createdAt = "createdAt";
  public static readonly updatedAt = "updatedAt";

  // Method to validate password
  public async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.passwordHash);
  }

  // Method to update password
  public async updatePassword(password: string): Promise<void> {
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || "12", 10);
    this.passwordHash = await bcrypt.hash(password, saltRounds);
    await this.save();
  }

  // Model associations
  public static associate(models: any): void {
    Voter.hasOne(models.VoterCard, {
      foreignKey: "userId",
      as: "voterCard",
    });

    Voter.hasOne(models.VerificationStatus, {
      foreignKey: "userId",
      as: "verificationStatus",
    });

    Voter.hasMany(models.Vote, {
      foreignKey: "userId",
      as: "votes",
    });

    Voter.hasMany(models.AuditLog, {
      foreignKey: "userId",
      as: "auditLogs",
    });

    Voter.hasMany(models.FailedAttempt, {
      foreignKey: "userId",
      as: "failedAttempts",
    });

    Voter.hasMany(models.UssdSession, {
      foreignKey: "userId",
      as: "ussdSessions",
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
          type: DataTypes.STRING(15),
          allowNull: false,
          validate: {
            is: /^\+?[0-9]{10,15}$/,
            notEmpty: true,
          },
        },
        dateOfBirth: {
          type: DataTypes.DATEONLY,
          allowNull: false,
        },
        passwordHash: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        recoveryToken: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        recoveryTokenExpiry: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        isActive: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        lastLogin: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        createdAt: {
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
        modelName: "Voter",
        tableName: "voters",
        underscored: false,
        timestamps: true,
        indexes: [
          { unique: true, fields: ["nin"] },
          { unique: true, fields: ["vin"] },
          { fields: ["phoneNumber"] },
        ],
        hooks: {
          beforeCreate: async (voter: Voter & { password?: string }) => {
            if (voter.password) {
              const saltRounds = parseInt(
                process.env.BCRYPT_SALT_ROUNDS || "12",
                10,
              );
              voter.passwordHash = await bcrypt.hash(
                voter.password,
                saltRounds,
              );
              delete voter.password; // Remove plain text password
            }
          },
          beforeUpdate: async (voter: Voter & { password?: string }) => {
            if (voter.password) {
              const saltRounds = parseInt(
                process.env.BCRYPT_SALT_ROUNDS || "12",
                10,
              );
              voter.passwordHash = await bcrypt.hash(
                voter.password,
                saltRounds,
              );
              delete voter.password; // Remove plain text password
            }
          },
        },
      },
    );
  }
}

export default Voter;
