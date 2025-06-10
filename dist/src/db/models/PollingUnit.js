"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class PollingUnit extends sequelize_1.Model {
    id;
    pollingUnitCode;
    pollingUnitName;
    state;
    lga;
    ward;
    geolocation;
    address;
    latitude;
    longitude;
    registeredVoters;
    assignedOfficer;
    isActive;
    createdAt;
    updatedAt;
    officer;
    voters;
    votes;
    static associate(models) {
        PollingUnit.hasMany(models.Voter, {
            sourceKey: 'pollingUnitCode',
            foreignKey: 'polling_unit_code',
            as: 'voters',
        });
        PollingUnit.hasMany(models.Vote, {
            foreignKey: 'pollingUnitId',
            sourceKey: 'id',
            as: 'votes',
        });
        PollingUnit.belongsTo(models.AdminUser, {
            foreignKey: 'assignedOfficer',
            targetKey: 'id',
            as: 'officer',
        });
    }
    static initialize(sequelize) {
        return PollingUnit.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
            },
            pollingUnitCode: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: false,
                unique: true,
                field: 'polling_unit_code',
                validate: {
                    notEmpty: true,
                },
            },
            pollingUnitName: {
                type: sequelize_1.DataTypes.STRING(100),
                allowNull: false,
                field: 'polling_unit_name',
                validate: {
                    notEmpty: true,
                },
            },
            state: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: false,
                validate: {
                    notEmpty: true,
                },
            },
            lga: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: false,
                validate: {
                    notEmpty: true,
                },
            },
            ward: {
                type: sequelize_1.DataTypes.STRING(100),
                allowNull: false,
                validate: {
                    notEmpty: true,
                },
            },
            geolocation: {
                type: sequelize_1.DataTypes.JSONB,
                allowNull: true,
            },
            address: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: true,
            },
            latitude: {
                type: sequelize_1.DataTypes.FLOAT,
                allowNull: true,
            },
            longitude: {
                type: sequelize_1.DataTypes.FLOAT,
                allowNull: true,
            },
            registeredVoters: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                field: 'registered_voters',
                defaultValue: 0,
                validate: {
                    min: 0,
                },
            },
            assignedOfficer: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                field: 'assigned_officer',
                references: {
                    model: 'admin_users',
                    key: 'id',
                },
                onDelete: 'SET NULL',
                onUpdate: 'CASCADE',
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
            modelName: 'PollingUnit',
            tableName: 'polling_units',
            underscored: true,
            timestamps: true,
            indexes: [
                { unique: true, fields: ['polling_unit_code'] },
                { fields: ['state', 'lga', 'ward'] },
                { fields: ['assigned_officer'] },
                { fields: ['is_active'] },
            ],
        });
    }
}
exports.default = PollingUnit;
//# sourceMappingURL=PollingUnit.js.map