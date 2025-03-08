import { Model, DataTypes, Sequelize, Optional } from "sequelize";

interface AdminRoleAttributes {
  id: string;
  adminId: string;
  roleName: string;
  roleScope: any | null;
  assignedAt: Date;
  assignedBy: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface AdminRoleCreationAttributes
  extends Optional<
    AdminRoleAttributes,
    | "id"
    | "roleScope"
    | "assignedAt"
    | "assignedBy"
    | "isActive"
    | "createdAt"
    | "updatedAt"
  > {}

class AdminRole
  extends Model<AdminRoleAttributes, AdminRoleCreationAttributes>
  implements AdminRoleAttributes
{
  public id!: string;
  public adminId!: string;
  public roleName!: string;
  public roleScope!: any | null;
  public assignedAt!: Date;
  public assignedBy!: string | null;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Timestamps
  public static readonly createdAt = "createdAt";
  public static readonly updatedAt = "updatedAt";

  // Model associations
  public static associate(models: any): void {
    AdminRole.belongsTo(models.AdminUser, {
      foreignKey: "adminId",
      as: "admin",
    });

    AdminRole.belongsTo(models.AdminUser, {
      foreignKey: "assignedBy",
      as: "assigner",
    });
  }

  public static initialize(sequelize: Sequelize): typeof AdminRole {
    return AdminRole.init(
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
        roleName: {
          type: DataTypes.STRING(50),
          allowNull: false,
          validate: {
            notEmpty: true,
          },
        },
        roleScope: {
          type: DataTypes.JSONB,
          allowNull: true,
        },
        assignedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        assignedBy: {
          type: DataTypes.UUID,
          allowNull: true,
          references: {
            model: "admin_users",
            key: "id",
          },
          onDelete: "SET NULL",
          onUpdate: "CASCADE",
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
      },
      {
        sequelize,
        modelName: "AdminRole",
        tableName: "admin_roles",
        underscored: false,
        timestamps: true,
        indexes: [
          { fields: ["adminId"] },
          { fields: ["roleName"] },
          { fields: ["assignedBy"] },
          { fields: ["isActive"] },
        ],
      },
    );
  }
}

export default AdminRole;
