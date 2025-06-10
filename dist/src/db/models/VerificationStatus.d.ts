import { Model, Sequelize, Optional } from 'sequelize';
interface VerificationStatusAttributes {
    id: string;
    userId: string;
    isPhoneVerified: boolean;
    isEmailVerified: boolean;
    isIdentityVerified: boolean;
    isAddressVerified: boolean;
    isBiometricVerified: boolean;
    verificationLevel: number;
    lastVerifiedAt: Date | null;
    isVerified: boolean;
    state: string;
    verifiedAt: Date | null;
    verificationMethod: string;
    verificationData: any;
    createdAt: Date;
    updatedAt: Date;
}
interface VerificationStatusCreationAttributes extends Optional<VerificationStatusAttributes, 'id' | 'isPhoneVerified' | 'isEmailVerified' | 'isIdentityVerified' | 'isAddressVerified' | 'isBiometricVerified' | 'verificationLevel' | 'lastVerifiedAt' | 'isVerified' | 'state' | 'verifiedAt' | 'verificationMethod' | 'verificationData' | 'createdAt' | 'updatedAt'> {
}
declare class VerificationStatus extends Model<VerificationStatusAttributes, VerificationStatusCreationAttributes> implements VerificationStatusAttributes {
    id: string;
    userId: string;
    isPhoneVerified: boolean;
    isEmailVerified: boolean;
    isIdentityVerified: boolean;
    isAddressVerified: boolean;
    isBiometricVerified: boolean;
    verificationLevel: number;
    lastVerifiedAt: Date | null;
    isVerified: boolean;
    state: string;
    verifiedAt: Date | null;
    verificationMethod: string;
    verificationData: any;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    static readonly createdAt = "createdAt";
    static readonly updatedAt = "updatedAt";
    static associate(models: any): void;
    static initialize(sequelize: Sequelize): typeof VerificationStatus;
}
export default VerificationStatus;
