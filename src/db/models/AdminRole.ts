import { Model, DataTypes, Sequelize, Optional } from 'sequelize';

interface AdminRoleAttributes {
  id: string;
  adminId: string;
  roleName: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface AdminRoleCreationAttributes
  extends Optional<
    AdminRoleAttributes,
    'id' | 'description' | 'isActive' | 'createdAt' | 'updatedAt'
  > {}

class AdminRole
  extends Model<AdminRoleAttributes, AdminRoleCreationAttributes>
  implements AdminRoleAttributes
{
  declare id: string;
  declare adminId: string;
  declare roleName: string;
  declare description: string | null;
  declare isActive: boolean;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  // Timestamps
  public static readonly createdAt = 'createdAt';
  public static readonly updatedAt = 'updatedAt';

  // Model associations
  public static associate(models: any): void {
    AdminRole.belongsTo(models.AdminUser, {
      foreignKey: 'admin_id',
      as: 'admin',
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
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
          field: 'description',
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
        indexes: [{ fields: ['admin_id'] }, { fields: ['role_name'] }, { fields: ['is_active'] }],
      },
    );
  }
}

export default AdminRole;
