import { Model, DataTypes, Sequelize, Optional } from 'sequelize';

interface AdminLogAttributes {
  id: string;
  adminId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  details: any | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

interface AdminLogCreationAttributes
  extends Optional<
    AdminLogAttributes,
    'id' | 'adminId' | 'resourceId' | 'details' | 'ipAddress' | 'userAgent' | 'createdAt'
  > {}

class AdminLog
  extends Model<AdminLogAttributes, AdminLogCreationAttributes>
  implements AdminLogAttributes
{
  declare id: string;
  declare adminId: string | null;
  declare action: string;
  declare resourceType: string;
  declare resourceId: string | null;
  declare details: any | null;
  declare ipAddress: string | null;
  declare userAgent: string | null;
  declare readonly createdAt: Date;

  // Timestamps
  public static readonly createdAt = 'createdAt';

  // Model associations
  public static associate(models: any): void {
    AdminLog.belongsTo(models.AdminUser, {
      foreignKey: 'admin_id',
      as: 'admin',
    });
  }

  public static initialize(sequelize: Sequelize): typeof AdminLog {
    return AdminLog.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        adminId: {
          type: DataTypes.UUID,
          field: 'admin_id',
          allowNull: true,
          validate: {
            isUUID: {
              msg: 'Invalid UUID format for admin_id',
              args: 4,
            },
          },
        },
        action: {
          type: DataTypes.STRING(100),
          allowNull: false,
          validate: {
            notEmpty: true,
          },
        },
        resourceType: {
          type: DataTypes.STRING(50),
          allowNull: false,
          field: 'resource_type',
          validate: {
            notEmpty: true,
          },
        },
        resourceId: {
          type: DataTypes.STRING(255),
          allowNull: true,
          field: 'resource_id',
        },
        details: {
          type: DataTypes.JSONB,
          allowNull: true,
        },
        ipAddress: {
          type: DataTypes.STRING(50),
          allowNull: true,
          field: 'ip_address',
        },
        userAgent: {
          type: DataTypes.TEXT,
          allowNull: true,
          field: 'user_agent',
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
          field: 'created_at',
        },
      },
      {
        sequelize,
        modelName: 'AdminLog',
        tableName: 'admin_logs',
        underscored: true,
        timestamps: false, // Only has createdAt, not updatedAt
        indexes: [
          { fields: ['admin_id'] },
          { fields: ['action'] },
          { fields: ['resource_type'] },
          { fields: ['created_at'] },
        ],
      },
    );
  }
}

export default AdminLog;
