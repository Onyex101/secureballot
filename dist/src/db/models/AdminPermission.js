"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccessLevel = void 0;
const sequelize_1 = require("sequelize");
// Access level enum
var AccessLevel;
(function (AccessLevel) {
    AccessLevel["READ"] = "read";
    AccessLevel["WRITE"] = "write";
    AccessLevel["UPDATE"] = "update";
    AccessLevel["DELETE"] = "delete";
    AccessLevel["FULL"] = "full";
})(AccessLevel = exports.AccessLevel || (exports.AccessLevel = {}));
class AdminPermission extends sequelize_1.Model {
    id;
    adminId;
    permissionName;
    resourceType;
    resourceId;
    accessLevel;
    grantedAt;
    grantedBy;
    expiresAt;
    createdAt;
    updatedAt;
    // Timestamps
    static createdAt = 'createdAt';
    static updatedAt = 'updatedAt';
    // Model associations
    static associate(models) {
        AdminPermission.belongsTo(models.AdminUser, {
            foreignKey: 'admin_id',
            as: 'admin',
        });
        AdminPermission.belongsTo(models.AdminUser, {
            foreignKey: 'granted_by',
            as: 'grantor',
        });
    }
    static initialize(sequelize) {
        return AdminPermission.init({
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
            permissionName: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: false,
                field: 'permission_name',
                validate: {
                    notEmpty: true,
                },
            },
            resourceType: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: true,
                field: 'resource_type',
            },
            resourceId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                field: 'resource_id',
            },
            accessLevel: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: false,
                field: 'access_level',
                defaultValue: AccessLevel.READ,
                validate: {
                    isIn: [Object.values(AccessLevel)],
                },
            },
            grantedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                field: 'granted_at',
                defaultValue: sequelize_1.DataTypes.NOW,
            },
            grantedBy: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                field: 'granted_by',
                references: {
                    model: 'admin_users',
                    key: 'id',
                },
                onDelete: 'SET NULL',
                onUpdate: 'CASCADE',
            },
            expiresAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
                field: 'expires_at',
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
            modelName: 'AdminPermission',
            tableName: 'admin_permissions',
            underscored: true,
            timestamps: true,
            indexes: [
                { fields: ['admin_id'] },
                { fields: ['permission_name'] },
                { fields: ['resource_type', 'resource_id'] },
                { fields: ['granted_by'] },
                { fields: ['expires_at'] },
            ],
        });
    }
}
exports.default = AdminPermission;
//# sourceMappingURL=AdminPermission.js.map