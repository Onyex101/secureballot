import { Model, DataTypes, Sequelize, Optional } from 'sequelize';

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
    'id' | 'roleScope' | 'assignedAt' | 'assignedBy' | 'isActive' | 'createdAt' | 'updatedAt'
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
  public static readonly createdAt = 'createdAt';
  public static readonly updatedAt = 'updatedAt';

  // Model associations
  public static associate(models: any): void {
    AdminRole.belongsTo(models.AdminUser, {
      foreignKey: 'admin_id',
      as: 'admin',
    });

    AdminRole.belongsTo(models.AdminUser, {
      foreignKey: 'assigned_by',
      as: 'assigner',
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
          field: 'admin_id',
          references: {
            model: 'admin_users',
            key: 'id',
          },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        roleName: {
          type: DataTypes.STRING(50),
          allowNull: false,
          field: 'role_name',
          validate: {
            notEmpty: true,
          },
        },
        roleScope: {
          type: DataTypes.JSONB,
          allowNull: true,
          field: 'role_scope',
        },
        assignedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          field: 'assigned_at',
          defaultValue: DataTypes.NOW,
        },
        assignedBy: {
          type: DataTypes.UUID,
          allowNull: true,
          field: 'assigned_by',
          references: {
            model: 'admin_users',
            key: 'id',
          },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
        },
        isActive: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          field: 'is_active',
          defaultValue: true,
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          field: 'created_at',
          defaultValue: DataTypes.NOW,
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          field: 'updated_at',
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize,
        modelName: 'AdminRole',
        tableName: 'admin_roles',
        underscored: true,
        timestamps: true,
        indexes: [
          { fields: ['admin_id'] },
          { fields: ['role_name'] },
          { fields: ['assigned_by'] },
          { fields: ['is_active'] },
        ],
      },
    );
  }
}

export default AdminRole;
