import { Model, DataTypes, Sequelize, Optional } from "sequelize";

// Report type enum
export enum ReportType {
  OPENING = "opening",
  VOTING_PROCESS = "voting_process",
  CLOSING = "closing",
  INCIDENT = "incident",
  GENERAL = "general",
}

// Report severity enum
export enum ReportSeverity {
  INFO = "info",
  CONCERN = "concern",
  VIOLATION = "violation",
  CRITICAL = "critical",
}

// Report status enum
export enum ReportStatus {
  SUBMITTED = "submitted",
  UNDER_REVIEW = "under_review",
  RESOLVED = "resolved",
  DISMISSED = "dismissed",
}

interface ObserverReportAttributes {
  id: string;
  observerId: string;
  electionId: string;
  pollingUnitCode: string;
  reportType: ReportType;
  reportDetails: string;
  severity: ReportSeverity;
  mediaUrls: any | null;
  reportedAt: Date;
  status: ReportStatus;
  officialResponse: string | null;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface ObserverReportCreationAttributes
  extends Optional<
    ObserverReportAttributes,
    | "id"
    | "mediaUrls"
    | "reportedAt"
    | "status"
    | "officialResponse"
    | "reviewedBy"
    | "reviewedAt"
    | "createdAt"
    | "updatedAt"
  > {}

class ObserverReport
  extends Model<ObserverReportAttributes, ObserverReportCreationAttributes>
  implements ObserverReportAttributes
{
  public id!: string;
  public observerId!: string;
  public electionId!: string;
  public pollingUnitCode!: string;
  public reportType!: ReportType;
  public reportDetails!: string;
  public severity!: ReportSeverity;
  public mediaUrls!: any | null;
  public reportedAt!: Date;
  public status!: ReportStatus;
  public officialResponse!: string | null;
  public reviewedBy!: string | null;
  public reviewedAt!: Date | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Timestamps
  public static readonly createdAt = "createdAt";
  public static readonly updatedAt = "updatedAt";

  // Model associations
  public static associate(models: any): void {
    ObserverReport.belongsTo(models.AdminUser, {
      foreignKey: "observerId",
      as: "observer",
    });

    ObserverReport.belongsTo(models.Election, {
      foreignKey: "electionId",
      as: "election",
    });

    ObserverReport.belongsTo(models.PollingUnit, {
      foreignKey: "pollingUnitCode",
      targetKey: "pollingUnitCode",
      as: "pollingUnit",
    });

    ObserverReport.belongsTo(models.AdminUser, {
      foreignKey: "reviewedBy",
      as: "reviewer",
    });
  }

  public static initialize(sequelize: Sequelize): typeof ObserverReport {
    return ObserverReport.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        observerId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: "admin_users",
            key: "id",
          },
          onDelete: "CASCADE",
          onUpdate: "CASCADE",
        },
        electionId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: "elections",
            key: "id",
          },
          onDelete: "CASCADE",
          onUpdate: "CASCADE",
        },
        pollingUnitCode: {
          type: DataTypes.STRING(50),
          allowNull: false,
          references: {
            model: "polling_units",
            key: "pollingUnitCode",
          },
          onDelete: "RESTRICT",
          onUpdate: "CASCADE",
        },
        reportType: {
          type: DataTypes.STRING(50),
          allowNull: false,
          validate: {
            isIn: [Object.values(ReportType)],
          },
        },
        reportDetails: {
          type: DataTypes.TEXT,
          allowNull: false,
          validate: {
            notEmpty: true,
          },
        },
        severity: {
          type: DataTypes.STRING(50),
          allowNull: false,
          defaultValue: ReportSeverity.INFO,
          validate: {
            isIn: [Object.values(ReportSeverity)],
          },
        },
        mediaUrls: {
          type: DataTypes.JSONB,
          allowNull: true,
        },
        reportedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        status: {
          type: DataTypes.STRING(50),
          allowNull: false,
          defaultValue: ReportStatus.SUBMITTED,
          validate: {
            isIn: [Object.values(ReportStatus)],
          },
        },
        officialResponse: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        reviewedBy: {
          type: DataTypes.UUID,
          allowNull: true,
          references: {
            model: "admin_users",
            key: "id",
          },
          onDelete: "SET NULL",
          onUpdate: "CASCADE",
        },
        reviewedAt: {
          type: DataTypes.DATE,
          allowNull: true,
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
        modelName: "ObserverReport",
        tableName: "observer_reports",
        underscored: false,
        timestamps: true,
        indexes: [
          { fields: ["observerId"] },
          { fields: ["electionId"] },
          { fields: ["pollingUnitCode"] },
          { fields: ["reportType"] },
          { fields: ["severity"] },
          { fields: ["status"] },
          { fields: ["reportedAt"] },
        ],
        hooks: {
          beforeUpdate: async (report: ObserverReport) => {
            // Set review timestamp when status changes from submitted
            if (
              report.changed("status") &&
              report.previous("status") === ReportStatus.SUBMITTED &&
              report.status !== ReportStatus.SUBMITTED
            ) {
              report.reviewedAt = new Date();
            }
          },
        },
      },
    );
  }
}

export default ObserverReport;
