import { Model, Sequelize, Optional } from 'sequelize';
export declare enum ReportType {
    OPENING = "opening",
    VOTING_PROCESS = "voting_process",
    CLOSING = "closing",
    INCIDENT = "incident",
    GENERAL = "general"
}
export declare enum ReportSeverity {
    INFO = "info",
    CONCERN = "concern",
    VIOLATION = "violation",
    CRITICAL = "critical"
}
export declare enum ReportStatus {
    SUBMITTED = "submitted",
    UNDER_REVIEW = "under_review",
    RESOLVED = "resolved",
    DISMISSED = "dismissed"
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
interface ObserverReportCreationAttributes extends Optional<ObserverReportAttributes, 'id' | 'mediaUrls' | 'reportedAt' | 'status' | 'officialResponse' | 'reviewedBy' | 'reviewedAt' | 'createdAt' | 'updatedAt'> {
}
declare class ObserverReport extends Model<ObserverReportAttributes, ObserverReportCreationAttributes> implements ObserverReportAttributes {
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
    readonly createdAt: Date;
    readonly updatedAt: Date;
    static readonly createdAt = "createdAt";
    static readonly updatedAt = "updatedAt";
    static associate(models: any): void;
    static initialize(sequelize: Sequelize): typeof ObserverReport;
}
export default ObserverReport;
