import { Model, DataTypes, Sequelize, Optional } from "sequelize";
import bcrypt from "bcrypt";
import { UserRole } from "../../middleware/accessControl";

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
  public createdAt!: Date;
  public updatedAt!: Date;
  public lastLogin!: Date | null;
  public createdBy!: string | null;
  public recoveryToken!: string | null;
  public recoveryTokenExpiry!: Date | null;

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
    AdminUser.hasMany(models.Election, {
      foreignKey: "createdBy",
      as: "createdElections",
    });

    AdminUser.hasMany(models.AdminUser, {
      foreignKey: "createdBy",
      as: "createdUsers",
    });

    AdminUser.belongsTo(models.AdminUser, {
      foreignKey: "createdBy",
      as: "creator",
    });

    AdminUser.hasMany(models.AdminRole, {
      foreignKey: "adminId",
      as: "roles",
    });

    AdminUser.hasMany(models.AdminPermission, {
      foreignKey: "adminId",
      as: "permissions",
    });

    AdminUser.hasMany(models.AdminLog, {
      foreignKey: "adminId",
      as: "logs",
    });

    AdminUser.hasMany(models.PollingUnit, {
      foreignKey: "assignedOfficer",
      as: "assignedPollingUnits",
    });

    AdminUser.hasMany(models.ObserverReport, {
      foreignKey: "observerId",
      as: "reports",
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
          unique: true,
          validate: {
            is: /^\+?[0-9]{10,15}$/,
            notEmpty: true,
          },
        },
        passwordHash: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        adminType: {
          type: DataTypes.STRING(50),
          allowNull: false,
          validate: {
            isIn: [Object.values(UserRole)],
          },
        },
        isActive: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
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
        lastLogin: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        createdBy: {
          type: DataTypes.UUID,
          allowNull: true,
          references: {
            model: "admin_users",
            key: "id",
          },
          onDelete: "SET NULL",
          onUpdate: "CASCADE",
        },
        recoveryToken: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        recoveryTokenExpiry: {
          type: DataTypes.DATE,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "AdminUser",
        tableName: "admin_users",
        underscored: false,
        timestamps: true,
        indexes: [
          { unique: true, fields: ["email"] },
          { unique: true, fields: ["phoneNumber"] },
          { fields: ["adminType"] },
          { fields: ["isActive"] },
        ],
        hooks: {
          beforeCreate: async (
            adminUser: AdminUser & { password?: string },
          ) => {
            if (adminUser.password) {
              const saltRounds = parseInt(
                process.env.BCRYPT_SALT_ROUNDS || "12",
                10,
              );
              adminUser.passwordHash = await bcrypt.hash(
                adminUser.password,
                saltRounds,
              );
              delete adminUser.password; // Remove plain text password
            }
          },
          beforeUpdate: async (
            adminUser: AdminUser & { password?: string },
          ) => {
            if (adminUser.password) {
              const saltRounds = parseInt(
                process.env.BCRYPT_SALT_ROUNDS || "12",
                10,
              );
              adminUser.passwordHash = await bcrypt.hash(
                adminUser.password,
                saltRounds,
              );
              delete adminUser.password; // Remove plain text password
            }
          },
        },
      },
    );
  }
}

export default AdminUser;
