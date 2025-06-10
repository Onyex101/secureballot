import { Model, Sequelize, Optional } from 'sequelize';
interface UssdVoteAttributes {
    id: string;
    sessionCode: string;
    userId: string;
    electionId: string;
    candidateId: string;
    voteTimestamp: Date;
    confirmationCode: string;
    isProcessed: boolean;
    processedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
interface UssdVoteCreationAttributes extends Optional<UssdVoteAttributes, 'id' | 'voteTimestamp' | 'isProcessed' | 'processedAt' | 'createdAt' | 'updatedAt'> {
}
declare class UssdVote extends Model<UssdVoteAttributes, UssdVoteCreationAttributes> implements UssdVoteAttributes {
    id: string;
    sessionCode: string;
    userId: string;
    electionId: string;
    candidateId: string;
    voteTimestamp: Date;
    confirmationCode: string;
    isProcessed: boolean;
    processedAt: Date | null;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    static readonly createdAt = "createdAt";
    static readonly updatedAt = "updatedAt";
    static associate(models: any): void;
    static initialize(sequelize: Sequelize): typeof UssdVote;
}
export default UssdVote;
