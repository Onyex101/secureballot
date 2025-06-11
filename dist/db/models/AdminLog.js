"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class AdminLog extends sequelize_1.Model {
    // Timestamps
    static createdAt = 'createdAt';
    // Model associations
    static associate(models) {
        AdminLog.belongsTo(models.AdminUser, {
            foreignKey: 'admin_id',
            as: 'admin',
        });
    }
    static initialize(sequelize) {
        return AdminLog.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
            },
            adminId: {
                type: sequelize_1.DataTypes.UUID,
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
                type: sequelize_1.DataTypes.STRING(100),
                allowNull: false,
                validate: {
                    notEmpty: true,
                },
            },
            resourceType: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: false,
                field: 'resource_type',
                validate: {
                    notEmpty: true,
                },
            },
            resourceId: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: true,
                field: 'resource_id',
            },
            details: {
                type: sequelize_1.DataTypes.JSONB,
                allowNull: true,
            },
            ipAddress: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: true,
                field: 'ip_address',
            },
            userAgent: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
                field: 'user_agent',
            },
            createdAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                defaultValue: sequelize_1.DataTypes.NOW,
                field: 'created_at',
            },
        }, {
            sequelize,
            modelName: 'AdminLog',
            tableName: 'admin_logs',
            underscored: true,
            timestamps: false,
            indexes: [
                { fields: ['admin_id'] },
                { fields: ['action'] },
                { fields: ['resource_type'] },
                { fields: ['created_at'] },
            ],
        });
    }
}
exports.default = AdminLog;
//# sourceMappingURL=AdminLog.js.map