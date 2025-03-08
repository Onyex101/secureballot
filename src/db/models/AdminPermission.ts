import { Model, DataTypes, Sequelize, Optional } from "sequelize";

// Access level enum
export enum AccessLevel {
  READ = "read",
  WRITE = "write",
  UPDATE = "update",
  DELETE = "delete",
  FULL = "full",
}

interface AdminPermissionAttributes {
  id: string;
  adminId: string;
  permissionName: string;
  resourceType: string | null;
  resourceId: string | null;
  accessLevel: AccessLevel;
  grantedAt: Date;
  grantedBy: string | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface AdminPermissionCreationAttributes
  extends Optional<
    AdminPermissionAttributes,
    | "id"
    | "resourceType"
    | "resourceId"
    | "grantedAt"
    | "grantedBy"
    | "expiresAt"
    | "createdAt"
    | "updatedAt"
  > {}

class AdminPermission
  extends Model<AdminPermissionAttributes, AdminPermissionCreationAttributes>
  implements AdminPermissionAttributes
{
  public id!: string;
  public adminId!: string;
  public permissionName!: string;
  public resourceType!: string | null;
  public resourceId!: string | null;
  public accessLevel!: AccessLevel;
  public grantedAt!: Date;
  public grantedBy!: string | null;
  public expiresAt!: Date | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Timestamps
  public static readonly createdAt = "createdAt";
  public static readonly updatedAt = "updatedAt";

  // Model associations
  public static associate(models: any): void {
    AdminPermission.belongsTo(models.AdminUser, {
      foreignKey: "adminId",
      as: "admin",
    });

    AdminPermission.belongsTo(models.AdminUser, {
      foreignKey: "grantedBy",
      as: "grantor",
    });
  }

  public static initialize(sequelize: Sequelize): typeof AdminPermission {
    return AdminPermission.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        adminId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: "admin_users",
            key: "id",
          },
          onDelete: "CASCADE",
          onUpdate: "CASCADE",
        },
        permissionName: {
          type: DataTypes.STRING(50),
          allowNull: false,
          validate: {
            notEmpty: true,
          },
        },
        resourceType: {
          type: DataTypes.STRING(50),
          allowNull: true,
        },
        resourceId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        accessLevel: {
          type: DataTypes.STRING(50),
          allowNull: false,
          defaultValue: AccessLevel.READ,
          validate: {
            isIn: [Object.values(AccessLevel)],
          },
        },
        grantedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        grantedBy: {
          type: DataTypes.UUID,
          allowNull: true,
          references: {
            model: "admin_users",
            key: "id",
          },
          onDelete: "SET NULL",
          onUpdate: "CASCADE",
        },
        expiresAt: {
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
        modelName: "AdminPermission",
        tableName: "admin_permissions",
        underscored: false,
        timestamps: true,
        indexes: [
          { fields: ["adminId"] },
          { fields: ["permissionName"] },
          { fields: ["resourceType", "resourceId"] },
          { fields: ["grantedBy"] },
          { fields: ["expiresAt"] },
        ],
      },
    );
  }
}

export default AdminPermission;
