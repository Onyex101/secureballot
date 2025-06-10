import { Model, Sequelize, Optional } from 'sequelize';
import Election from './Election';
import AdminUser from './AdminUser';
interface ElectionKeyAttributes {
    id: string;
    electionId: string;
    publicKey: string;
    publicKeyFingerprint: string;
    privateKeyShares: string[];
    keyGeneratedAt: Date;
    keyGeneratedBy: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
interface ElectionKeyCreationAttributes extends Optional<ElectionKeyAttributes, 'id' | 'keyGeneratedAt' | 'isActive' | 'createdAt' | 'updatedAt'> {
}
declare class ElectionKey extends Model<ElectionKeyAttributes, ElectionKeyCreationAttributes> implements ElectionKeyAttributes {
    id: string;
    electionId: string;
    publicKey: string;
    publicKeyFingerprint: string;
    privateKeyShares: string[];
    keyGeneratedAt: Date;
    keyGeneratedBy: string;
    isActive: boolean;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    election?: Election;
    generatedByAdmin?: AdminUser;
    static associate(models: any): void;
    static initialize(sequelize: Sequelize): typeof ElectionKey;
}
export default ElectionKey;
