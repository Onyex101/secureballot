import { Model, Sequelize, Optional } from 'sequelize';
interface AdminLogAttributes {
    id: string;
    adminId: string | null;
    action: string;
    resourceType: string;
    resourceId: string | null;
    details: any | null;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: Date;
}
interface AdminLogCreationAttributes extends Optional<AdminLogAttributes, 'id' | 'adminId' | 'resourceId' | 'details' | 'ipAddress' | 'userAgent' | 'createdAt'> {
}
declare class AdminLog extends Model<AdminLogAttributes, AdminLogCreationAttributes> implements AdminLogAttributes {
    id: string;
    adminId: string | null;
    action: string;
    resourceType: string;
    resourceId: string | null;
    details: any | null;
    ipAddress: string | null;
    userAgent: string | null;
    readonly createdAt: Date;
    static readonly createdAt = "createdAt";
    static associate(models: any): void;
    static initialize(sequelize: Sequelize): typeof AdminLog;
}
export default AdminLog;
