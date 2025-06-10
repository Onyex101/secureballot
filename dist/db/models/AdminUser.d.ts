import { Model, Sequelize, Optional } from 'sequelize';
import { UserRole } from '../../types/auth';
import AdminRole from './AdminRole';
import AdminPermission from './AdminPermission';
import AuditLog from './AuditLog';
import PollingUnit from './PollingUnit';
import Election from './Election';
interface AdminUserAttributes {
    id: string;
    fullName: string;
    email: string;
    phoneNumber: string;
    passwordHash: string;
    adminType: UserRole;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    lastLogin: Date | null;
    createdBy: string | null;
    recoveryToken: string | null;
    recoveryTokenExpiry: Date | null;
    mfaSecret: string | null;
    mfaEnabled: boolean;
    mfaBackupCodes: string[] | null;
    ninEncrypted: string | null;
}
interface AdminUserCreationAttributes extends Optional<AdminUserAttributes, 'id' | 'isActive' | 'createdAt' | 'updatedAt' | 'lastLogin' | 'createdBy' | 'recoveryToken' | 'recoveryTokenExpiry' | 'mfaSecret' | 'mfaEnabled' | 'mfaBackupCodes' | 'ninEncrypted'> {
    password: string;
    nin?: string;
}
declare class AdminUser extends Model<AdminUserAttributes, AdminUserCreationAttributes> implements AdminUserAttributes {
    id: string;
    fullName: string;
    email: string;
    phoneNumber: string;
    passwordHash: string;
    adminType: UserRole;
    isActive: boolean;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    lastLogin: Date | null;
    createdBy: string | null;
    recoveryToken: string | null;
    recoveryTokenExpiry: Date | null;
    mfaSecret: string | null;
    mfaEnabled: boolean;
    mfaBackupCodes: string[] | null;
    ninEncrypted: string | null;
    roles?: AdminRole[];
    permissions?: AdminPermission[];
    auditLogs?: AuditLog[];
    assignedPollingUnits?: PollingUnit[];
    createdElections?: Election[];
    creator?: AdminUser;
    createdUsers?: AdminUser[];
    password?: string;
    nin?: string;
    get decryptedNin(): string | null;
    static hashPassword(password: string): Promise<string>;
    validatePassword(password: string): Promise<boolean>;
    static associate(models: any): void;
    static initialize(sequelize: Sequelize): typeof AdminUser;
}
export default AdminUser;
