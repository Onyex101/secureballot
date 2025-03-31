import { Model, DataTypes, Sequelize, Optional } from 'sequelize';

// Report type enum
export enum ReportType {
  OPENING = 'opening',
  VOTING_PROCESS = 'voting_process',
  CLOSING = 'closing',
  INCIDENT = 'incident',
  GENERAL = 'general',
}

// Report severity enum
export enum ReportSeverity {
  INFO = 'info',
  CONCERN = 'concern',
  VIOLATION = 'violation',
  CRITICAL = 'critical',
}

// Report status enum
export enum ReportStatus {
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed',
}

interface ObserverReportAttributes {
  id: string;
  observerId: string;
  electionId: string;
  pollingUnitId: string;
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
    | 'id'
    | 'mediaUrls'
    | 'reportedAt'
    | 'status'
    | 'officialResponse'
    | 'reviewedBy'
    | 'reviewedAt'
    | 'createdAt'
    | 'updatedAt'
  > {}

class ObserverReport
  extends Model<ObserverReportAttributes, ObserverReportCreationAttributes>
  implements ObserverReportAttributes
{
  public id!: string;
  public observerId!: string;
  public electionId!: string;
  public pollingUnitId!: string;
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
  public static readonly createdAt = 'createdAt';
  public static readonly updatedAt = 'updatedAt';

  // Model associations
  public static associate(models: any): void {
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
          field: 'observer_id',
          references: {
            model: 'admin_users',
            key: 'id',
          },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        electionId: {
          type: DataTypes.UUID,
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
          type: DataTypes.UUID,
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
          type: DataTypes.STRING(50),
          allowNull: false,
          field: 'report_type',
          validate: {
            isIn: [Object.values(ReportType)],
          },
        },
        reportDetails: {
          type: DataTypes.TEXT,
          allowNull: false,
          field: 'report_details',
          validate: {
            notEmpty: true,
          },
        },
        severity: {
          type: DataTypes.STRING(50),
          allowNull: false,
          field: 'severity',
          defaultValue: ReportSeverity.INFO,
          validate: {
            isIn: [Object.values(ReportSeverity)],
          },
        },
        mediaUrls: {
          type: DataTypes.JSONB,
          allowNull: true,
          field: 'media_urls',
        },
        reportedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
          field: 'reported_at',
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
          field: 'official_response',
        },
        reviewedBy: {
          type: DataTypes.UUID,
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
          type: DataTypes.DATE,
          allowNull: true,
          field: 'reviewed_at',
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
          field: 'created_at',
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
          field: 'updated_at',
        },
      },
      {
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
          beforeUpdate: (report: ObserverReport) => {
            // Set review timestamp when status changes from submitted
            if (
              report.changed('status') &&
              report.previous('status') === ReportStatus.SUBMITTED &&
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
