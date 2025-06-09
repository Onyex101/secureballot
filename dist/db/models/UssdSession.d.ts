import { Model, Sequelize, Optional } from 'sequelize';
export declare enum UssdSessionStatus {
    CREATED = "created",
    AUTHENTICATED = "authenticated",
    ELECTION_SELECTED = "election_selected",
    CANDIDATE_SELECTED = "candidate_selected",
    VOTE_CONFIRMED = "vote_confirmed",
    COMPLETED = "completed",
    EXPIRED = "expired",
    CANCELLED = "cancelled"
}
interface UssdSessionAttributes {
    id: string;
    userId: string | null;
    sessionCode: string;
    phoneNumber: string;
    sessionData: any | null;
    createdAt: Date;
    expiresAt: Date;
    isActive: boolean;
    sessionStatus: UssdSessionStatus;
    lastActivity: Date;
    updatedAt: Date;
}
interface UssdSessionCreationAttributes extends Optional<UssdSessionAttributes, 'id' | 'userId' | 'sessionData' | 'isActive' | 'lastActivity' | 'createdAt' | 'updatedAt'> {
}
declare class UssdSession extends Model<UssdSessionAttributes, UssdSessionCreationAttributes> implements UssdSessionAttributes {
    id: string;
    userId: string | null;
    sessionCode: string;
    phoneNumber: string;
    sessionData: any | null;
    createdAt: Date;
    expiresAt: Date;
    isActive: boolean;
    sessionStatus: UssdSessionStatus;
    lastActivity: Date;
    readonly updatedAt: Date;
    static readonly createdAt = "createdAt";
    static readonly updatedAt = "updatedAt";
    static associate(models: any): void;
    static initialize(sequelize: Sequelize): typeof UssdSession;
}
export default UssdSession;
