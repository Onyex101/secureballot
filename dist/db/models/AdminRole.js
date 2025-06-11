"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class AdminRole extends sequelize_1.Model {
    // Timestamps
    static createdAt = 'createdAt';
    static updatedAt = 'updatedAt';
    // Model associations
    static associate(models) {
        AdminRole.belongsTo(models.AdminUser, {
            foreignKey: 'admin_id',
            as: 'admin',
        });
    }
    static initialize(sequelize) {
        return AdminRole.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
            },
            adminId: {
                type: sequelize_1.DataTypes.UUID,
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
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: false,
                field: 'role_name',
                validate: {
                    notEmpty: true,
                },
            },
            description: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
                field: 'description',
            },
            isActive: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                field: 'is_active',
                defaultValue: true,
            },
            createdAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                field: 'created_at',
                defaultValue: sequelize_1.DataTypes.NOW,
            },
            updatedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                field: 'updated_at',
                defaultValue: sequelize_1.DataTypes.NOW,
            },
        }, {
            sequelize,
            modelName: 'AdminRole',
            tableName: 'admin_roles',
            underscored: true,
            timestamps: true,
            indexes: [{ fields: ['admin_id'] }, { fields: ['role_name'] }, { fields: ['is_active'] }],
        });
    }
}
exports.default = AdminRole;
//# sourceMappingURL=AdminRole.js.map