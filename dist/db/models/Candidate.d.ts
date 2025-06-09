import { Model, Sequelize, Optional } from 'sequelize';
import Election from './Election';
import Vote from './Vote';
export declare enum CandidateStatus {
    PENDING = "pending",
    APPROVED = "approved",
    REJECTED = "rejected",
    DISQUALIFIED = "disqualified"
}
interface CandidateAttributes {
    id: string;
    electionId: string;
    fullName: string;
    partyCode: string;
    partyName: string;
    bio: string | null;
    photoUrl: string | null;
    position: string | null;
    manifesto: string | null;
    status: CandidateStatus;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
interface CandidateCreationAttributes extends Optional<CandidateAttributes, 'id' | 'bio' | 'photoUrl' | 'position' | 'manifesto' | 'status' | 'isActive' | 'createdAt' | 'updatedAt'> {
}
declare class Candidate extends Model<CandidateAttributes, CandidateCreationAttributes> implements CandidateAttributes {
    id: string;
    electionId: string;
    fullName: string;
    partyCode: string;
    partyName: string;
    bio: string | null;
    photoUrl: string | null;
    position: string | null;
    manifesto: string | null;
    status: CandidateStatus;
    isActive: boolean;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    election?: Election;
    votes?: Vote[];
    static associate(models: any): void;
    static initialize(sequelize: Sequelize): typeof Candidate;
}
export default Candidate;
