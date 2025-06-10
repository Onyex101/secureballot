import { Model, Sequelize, Optional } from 'sequelize';
export declare enum AttemptType {
    LOGIN = "login",
    PASSWORD_RESET = "password_reset",
    MFA = "mfa",
    USSD_AUTH = "ussd_auth",
    MOBILE_LOGIN = "mobile_login"
}
interface FailedAttemptAttributes {
    id: string;
    userId: string;
    attemptType: string;
    ipAddress: string | null;
    userAgent: string | null;
    attemptTime: Date;
}
interface FailedAttemptCreationAttributes extends Optional<FailedAttemptAttributes, 'id' | 'ipAddress' | 'userAgent' | 'attemptTime'> {
}
declare class FailedAttempt extends Model<FailedAttemptAttributes, FailedAttemptCreationAttributes> implements FailedAttemptAttributes {
    id: string;
    userId: string;
    attemptType: string;
    ipAddress: string | null;
    userAgent: string | null;
    attemptTime: Date;
    static associate(models: any): void;
    static initialize(sequelize: Sequelize): typeof FailedAttempt;
}
export default FailedAttempt;
