import { Model, Sequelize, Optional } from 'sequelize';
export declare enum OtpStatus {
    SENT = "sent",
    VERIFIED = "verified",
    EXPIRED = "expired",
    FAILED = "failed"
}
interface OtpLogAttributes {
    id: string;
    userId: string;
    otpCode: string;
    email: string;
    ipAddress: string | null;
    userAgent: string | null;
    status: OtpStatus;
    attempts: number;
    expiresAt: Date;
    verifiedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
interface OtpLogCreationAttributes extends Optional<OtpLogAttributes, 'id' | 'status' | 'attempts' | 'verifiedAt' | 'createdAt' | 'updatedAt'> {
}
declare class OtpLog extends Model<OtpLogAttributes, OtpLogCreationAttributes> implements OtpLogAttributes {
    id: string;
    userId: string;
    otpCode: string;
    email: string;
    ipAddress: string | null;
    userAgent: string | null;
    status: OtpStatus;
    attempts: number;
    expiresAt: Date;
    verifiedAt: Date | null;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    static readonly createdAt = "createdAt";
    static readonly updatedAt = "updatedAt";
    static associate(models: any): void;
    static initialize(sequelize: Sequelize): typeof OtpLog;
}
export default OtpLog;
