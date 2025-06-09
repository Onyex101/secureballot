"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportStatus = exports.ReportSeverity = exports.ReportType = void 0;
const sequelize_1 = require("sequelize");
// Report type enum
var ReportType;
(function (ReportType) {
    ReportType["OPENING"] = "opening";
    ReportType["VOTING_PROCESS"] = "voting_process";
    ReportType["CLOSING"] = "closing";
    ReportType["INCIDENT"] = "incident";
    ReportType["GENERAL"] = "general";
})(ReportType = exports.ReportType || (exports.ReportType = {}));
// Report severity enum
var ReportSeverity;
(function (ReportSeverity) {
    ReportSeverity["INFO"] = "info";
    ReportSeverity["CONCERN"] = "concern";
    ReportSeverity["VIOLATION"] = "violation";
    ReportSeverity["CRITICAL"] = "critical";
})(ReportSeverity = exports.ReportSeverity || (exports.ReportSeverity = {}));
// Report status enum
var ReportStatus;
(function (ReportStatus) {
    ReportStatus["SUBMITTED"] = "submitted";
    ReportStatus["UNDER_REVIEW"] = "under_review";
    ReportStatus["RESOLVED"] = "resolved";
    ReportStatus["DISMISSED"] = "dismissed";
})(ReportStatus = exports.ReportStatus || (exports.ReportStatus = {}));
class ObserverReport extends sequelize_1.Model {
    // Model associations
    static associate(models) {
        ObserverReport.belongsTo(models.AdminUser, {
            foreignKey: 'observer_id',
            as: 'observer',
        });
        ObserverReport.belongsTo(models.Election, {
            foreignKey: 'election_id',
            as: 'election',
        });
        ObserverReport.belongsTo(models.PollingUnit, {
            foreignKey: 'polling_unit_id',
            as: 'polling_unit',
        });
        ObserverReport.belongsTo(models.AdminUser, {
            foreignKey: 'reviewed_by',
            as: 'reviewer',
        });
    }
    static initialize(sequelize) {
        return ObserverReport.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
            },
            observerId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                field: 'observer_id',
                references: {
                    model: 'admin_users',
                    key: 'id',
                },
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE',
            },
            electionId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                field: 'election_id',
                references: {
                    model: 'elections',
                    key: 'id',
                },
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE',
            },
            pollingUnitId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                field: 'polling_unit_id',
                references: {
                    model: 'polling_units',
                    key: 'id',
                },
                onDelete: 'RESTRICT',
                onUpdate: 'CASCADE',
            },
            reportType: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: false,
                field: 'report_type',
                validate: {
                    isIn: [Object.values(ReportType)],
                },
            },
            reportDetails: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: false,
                field: 'report_details',
                validate: {
                    notEmpty: true,
                },
            },
            severity: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: false,
                field: 'severity',
                defaultValue: ReportSeverity.INFO,
                validate: {
                    isIn: [Object.values(ReportSeverity)],
                },
            },
            mediaUrls: {
                type: sequelize_1.DataTypes.JSONB,
                allowNull: true,
                field: 'media_urls',
            },
            reportedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                defaultValue: sequelize_1.DataTypes.NOW,
                field: 'reported_at',
            },
            status: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: false,
                defaultValue: ReportStatus.SUBMITTED,
                validate: {
                    isIn: [Object.values(ReportStatus)],
                },
            },
            officialResponse: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
                field: 'official_response',
            },
            reviewedBy: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                field: 'reviewed_by',
                references: {
                    model: 'admin_users',
                    key: 'id',
                },
                onDelete: 'SET NULL',
                onUpdate: 'CASCADE',
            },
            reviewedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
                field: 'reviewed_at',
            },
            createdAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                defaultValue: sequelize_1.DataTypes.NOW,
                field: 'created_at',
            },
            updatedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                defaultValue: sequelize_1.DataTypes.NOW,
                field: 'updated_at',
            },
        }, {
            sequelize,
            modelName: 'ObserverReport',
            tableName: 'observer_reports',
            underscored: false,
            timestamps: true,
            indexes: [
                { fields: ['observer_id'] },
                { fields: ['election_id'] },
                { fields: ['polling_unit_id'] },
                { fields: ['report_type'] },
                { fields: ['severity'] },
                { fields: ['status'] },
                { fields: ['reported_at'] },
            ],
            hooks: {
                beforeUpdate: (report) => {
                    // Set review timestamp when status changes from submitted
                    if (report.changed('status') &&
                        report.previous('status') === ReportStatus.SUBMITTED &&
                        report.status !== ReportStatus.SUBMITTED) {
                        report.reviewedAt = new Date();
                    }
                },
            },
        });
    }
}
// Timestamps
ObserverReport.createdAt = 'createdAt';
ObserverReport.updatedAt = 'updatedAt';
exports.default = ObserverReport;
//# sourceMappingURL=ObserverReport.js.map