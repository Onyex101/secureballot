import { Model, Sequelize, Optional } from 'sequelize';
interface VoterAttributes {
    id: string;
    nin: string;
    vin: string;
    phoneNumber: string;
    dateOfBirth: Date;
    fullName: string;
    pollingUnitCode: string;
    state: string;
    gender: string;
    lga: string;
    ward: string;
    passwordHash: string;
    recoveryToken: string | null;
    recoveryTokenExpiry: Date | null;
    isActive: boolean;
    lastLogin: Date | null;
    createdAt: Date;
    updatedAt: Date;
    mfaSecret: string | null;
    mfaEnabled: boolean;
    mfaBackupCodes: string[] | null;
    publicKey?: string;
    password?: string;
}
interface VoterCreationAttributes extends Optional<VoterAttributes, 'id' | 'passwordHash' | 'recoveryToken' | 'recoveryTokenExpiry' | 'isActive' | 'lastLogin' | 'createdAt' | 'updatedAt' | 'mfaSecret' | 'mfaEnabled' | 'mfaBackupCodes' | 'publicKey'> {
    password: string;
}
declare class Voter extends Model<VoterAttributes, VoterCreationAttributes> implements VoterAttributes {
    id: string;
    nin: string;
    vin: string;
    phoneNumber: string;
    dateOfBirth: Date;
    fullName: string;
    pollingUnitCode: string;
    state: string;
    gender: string;
    lga: string;
    ward: string;
    passwordHash: string;
    recoveryToken: string | null;
    recoveryTokenExpiry: Date | null;
    isActive: boolean;
    lastLogin: Date | null;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    mfaSecret: string | null;
    mfaEnabled: boolean;
    mfaBackupCodes: string[] | null;
    publicKey?: string;
    static readonly createdAt = "createdAt";
    static readonly updatedAt = "updatedAt";
    password?: string;
    validatePassword(password: string): Promise<boolean>;
    static associate(models: any): void;
    static initialize(sequelize: Sequelize): typeof Voter;
}
export default Voter;
