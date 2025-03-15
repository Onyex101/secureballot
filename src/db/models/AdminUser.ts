import { Model, DataTypes, Sequelize, Optional } from "sequelize";
import bcrypt from "bcrypt";
import { UserRole } from "../../types/auth";

interface AdminUserAttributes {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  passwordHash: string;
  adminType: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLogin: Date | null;
  createdBy: string | null;
  recoveryToken: string | null;
  recoveryTokenExpiry: Date | null;
  mfaSecret: string | null;
  mfaEnabled: boolean;
  mfaBackupCodes: string[] | null;
}

interface AdminUserCreationAttributes
  extends Optional<
    AdminUserAttributes,
    | "id"
    | "isActive"
    | "createdAt"
    | "updatedAt"
    | "lastLogin"
    | "createdBy"
    | "recoveryToken"
    | "recoveryTokenExpiry"
    | "mfaSecret"
    | "mfaEnabled"
    | "mfaBackupCodes"
  > {
  password: string;
}

class AdminUser
  extends Model<AdminUserAttributes, AdminUserCreationAttributes>
  implements AdminUserAttributes
{
  public id!: string;
  public fullName!: string;
  public email!: string;
  public phoneNumber!: string;
  public passwordHash!: string;
  public adminType!: UserRole;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public lastLogin!: Date | null;
  public createdBy!: string | null;
  public recoveryToken!: string | null;
  public recoveryTokenExpiry!: Date | null;
  public mfaSecret!: string | null;
  public mfaEnabled!: boolean;
  public mfaBackupCodes!: string[] | null;

  // Timestamps
  public static readonly createdAt = "createdAt";
  public static readonly updatedAt = "updatedAt";

  // Virtual fields
  public password?: string;

  // Password validation and hashing
  public static async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  public async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.passwordHash);
  }

  // Model associations
  public static associate(models: any): void {
    AdminUser.hasMany(models.AdminRole, {
      foreignKey: "admin_id",
      as: "roles",
    });

    AdminUser.hasMany(models.AdminPermission, {
      foreignKey: "admin_id",
      as: "permissions",
    });

    AdminUser.hasMany(models.PollingUnit, {
      foreignKey: "assigned_officer",
      as: "assignedPollingUnits",
    });

    AdminUser.hasMany(models.ObserverReport, {
      foreignKey: "observer_id",
      as: "observerReports",
    });

    AdminUser.hasMany(models.ObserverReport, {
      foreignKey: "reviewed_by",
      as: "reviewedReports",
    });

    AdminUser.hasMany(models.Election, {
      foreignKey: "created_by",
      as: "createdElections",
    });

    AdminUser.belongsTo(models.AdminUser, {
      foreignKey: "created_by",
      as: "creator",
    });

    AdminUser.hasMany(models.AdminUser, {
      foreignKey: "created_by",
      as: "createdUsers",
    });
  }

  public static initialize(sequelize: Sequelize): typeof AdminUser {
    return AdminUser.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        fullName: {
          type: DataTypes.STRING(100),
          allowNull: false,
          field: "full_name",
          validate: {
            notEmpty: true,
          },
        },
        email: {
          type: DataTypes.STRING(100),
          allowNull: false,
          unique: true,
          validate: {
            isEmail: true,
            notEmpty: true,
          },
        },
        phoneNumber: {
          type: DataTypes.STRING(15),
          allowNull: false,
          field: "phone_number",
          unique: true,
          validate: {
            is: /^\+?[0-9]{10,15}$/,
            notEmpty: true,
          },
        },
        passwordHash: {
          type: DataTypes.STRING(255),
          allowNull: false,
          field: "password_hash",
        },
        adminType: {
          type: DataTypes.STRING(50),
          allowNull: false,
          field: "admin_type",
          validate: {
            isIn: [Object.values(UserRole)],
          },
        },
        isActive: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          field: "is_active",
          defaultValue: true,
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          field: "created_at",
          defaultValue: DataTypes.NOW,
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          field: "updated_at",
          defaultValue: DataTypes.NOW,
        },
        lastLogin: {
          type: DataTypes.DATE,
          allowNull: true,
          field: "last_login",
        },
        createdBy: {
          type: DataTypes.UUID,
          allowNull: true,
          field: "created_by",
          references: {
            model: "admin_users",
            key: "id",
          },
        },
        recoveryToken: {
          type: DataTypes.STRING(255),
          allowNull: true,
          field: "recovery_token",
        },
        recoveryTokenExpiry: {
          type: DataTypes.DATE,
          allowNull: true,
          field: "recovery_token_expiry",
        },
        mfaSecret: {
          type: DataTypes.STRING(255),
          allowNull: true,
          field: "mfa_secret",
        },
        mfaEnabled: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          field: "mfa_enabled",
          defaultValue: false,
        },
        mfaBackupCodes: {
          type: DataTypes.ARRAY(DataTypes.STRING),
          allowNull: true,
          field: "mfa_backup_codes",
        },
      },
      {
        sequelize,
        modelName: "AdminUser",
        tableName: "admin_users",
        timestamps: true,
        hooks: {
          beforeCreate: async (user: AdminUser) => {
            if (user.password) {
              user.passwordHash = await AdminUser.hashPassword(user.password);
            }
          },
          beforeUpdate: async (user: AdminUser) => {
            if (user.password) {
              user.passwordHash = await AdminUser.hashPassword(user.password);
            }
          },
        },
      }
    );
  }
}

export default AdminUser;
