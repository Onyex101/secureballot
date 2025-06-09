import { Model, Sequelize, Optional } from 'sequelize';
interface AdminRoleAttributes {
    id: string;
    adminId: string;
    roleName: string;
    description: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
interface AdminRoleCreationAttributes extends Optional<AdminRoleAttributes, 'id' | 'description' | 'isActive' | 'createdAt' | 'updatedAt'> {
}
declare class AdminRole extends Model<AdminRoleAttributes, AdminRoleCreationAttributes> implements AdminRoleAttributes {
    id: string;
    adminId: string;
    roleName: string;
    description: string | null;
    isActive: boolean;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    static readonly createdAt = "createdAt";
    static readonly updatedAt = "updatedAt";
    static associate(models: any): void;
    static initialize(sequelize: Sequelize): typeof AdminRole;
}
export default AdminRole;
