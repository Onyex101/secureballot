/// <reference types="node" />
/// <reference types="node" />
import { Model, Sequelize, Optional } from 'sequelize';
import Voter from './Voter';
import Election from './Election';
import Candidate from './Candidate';
import PollingUnit from './PollingUnit';
export declare enum VoteSource {
    WEB = "web",
    MOBILE = "mobile",
    USSD = "ussd",
    OFFLINE = "offline"
}
interface VoteAttributes {
    id: string;
    userId: string;
    electionId: string;
    candidateId: string;
    pollingUnitId: string;
    encryptedVoteData: Buffer;
    encryptedAesKey: string;
    iv: string;
    voteHash: string;
    publicKeyFingerprint: string;
    voteTimestamp: Date;
    voteSource: VoteSource;
    isCounted: boolean;
    receiptCode: string;
    createdAt: Date;
    updatedAt: Date;
}
interface VoteCreationAttributes extends Optional<VoteAttributes, 'id' | 'voteTimestamp' | 'isCounted' | 'createdAt' | 'updatedAt' | 'receiptCode'> {
}
declare class Vote extends Model<VoteAttributes, VoteCreationAttributes> implements VoteAttributes {
    id: string;
    userId: string;
    electionId: string;
    candidateId: string;
    pollingUnitId: string;
    encryptedVoteData: Buffer;
    encryptedAesKey: string;
    iv: string;
    voteHash: string;
    publicKeyFingerprint: string;
    voteTimestamp: Date;
    voteSource: VoteSource;
    isCounted: boolean;
    receiptCode: string;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    voter?: Voter;
    election?: Election;
    candidate?: Candidate;
    pollingUnit?: PollingUnit;
    static associate(models: any): void;
    static initialize(sequelize: Sequelize): typeof Vote;
}
export default Vote;
