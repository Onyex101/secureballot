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
      foreignKey: "admin_id",
      as: "admin",
    });

    AdminPermission.belongsTo(models.AdminUser, {
      foreignKey: "granted_by",
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
          field: "admin_id",
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
          field: "permission_name",
          validate: {
            notEmpty: true,
          },
        },
        resourceType: {
          type: DataTypes.STRING(50),
          allowNull: true,
          field: "resource_type",
        },
        resourceId: {
          type: DataTypes.UUID,
          allowNull: true,
          field: "resource_id",
        },
        accessLevel: {
          type: DataTypes.STRING(50),
          allowNull: false,
          field: "access_level",
          defaultValue: AccessLevel.READ,
          validate: {
            isIn: [Object.values(AccessLevel)],
          },
        },
        grantedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          field: "granted_at",
          defaultValue: DataTypes.NOW,
        },
        grantedBy: {
          type: DataTypes.UUID,
          allowNull: true,
          field: "granted_by",
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
          field: "expires_at",
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
      },
      {
        sequelize,
        modelName: "AdminPermission",
        tableName: "admin_permissions",
        underscored: true,
        timestamps: true,
        indexes: [
          { fields: ["admin_id"] },
          { fields: ["permission_name"] },
          { fields: ["resource_type", "resource_id"] },
          { fields: ["granted_by"] },
          { fields: ["expires_at"] },
        ],
      },
    );
  }
}

export default AdminPermission;
