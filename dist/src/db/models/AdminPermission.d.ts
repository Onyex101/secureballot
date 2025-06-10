import { Model, Sequelize, Optional } from 'sequelize';
export declare enum AccessLevel {
    READ = "read",
    WRITE = "write",
    UPDATE = "update",
    DELETE = "delete",
    FULL = "full"
}
interface AdminPermissionAttributes {
    id: string;
    adminId: string;
    permissionName: string;
    resourceType: string | null;
    resourceId: string | null;
    accessLevel: AccessLevel;
    grantedAt: Date;
    grantedBy: string | null;
    expiresAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
interface AdminPermissionCreationAttributes extends Optional<AdminPermissionAttributes, 'id' | 'resourceType' | 'resourceId' | 'accessLevel' | 'grantedAt' | 'grantedBy' | 'expiresAt' | 'createdAt' | 'updatedAt'> {
}
declare class AdminPermission extends Model<AdminPermissionAttributes, AdminPermissionCreationAttributes> implements AdminPermissionAttributes {
    id: string;
    adminId: string;
    permissionName: string;
    resourceType: string | null;
    resourceId: string | null;
    accessLevel: AccessLevel;
    grantedAt: Date;
    grantedBy: string | null;
    expiresAt: Date | null;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    static readonly createdAt = "createdAt";
    static readonly updatedAt = "updatedAt";
    static associate(models: any): void;
    static initialize(sequelize: Sequelize): typeof AdminPermission;
}
export default AdminPermission;
