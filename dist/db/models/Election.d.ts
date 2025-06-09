import { Model, Sequelize, Optional } from 'sequelize';
import AdminUser from './AdminUser';
import Candidate from './Candidate';
import Vote from './Vote';
import ElectionStats from './ElectionStats';
export declare enum ElectionStatus {
    DRAFT = "draft",
    SCHEDULED = "scheduled",
    ACTIVE = "active",
    PAUSED = "paused",
    COMPLETED = "completed",
    CANCELLED = "cancelled"
}
export declare enum ElectionType {
    PRESIDENTIAL = "Presidential",
    GUBERNATORIAL = "Gubernatorial",
    SENATORIAL = "Senatorial",
    HOUSE_OF_REPS = "HouseOfReps",
    STATE_ASSEMBLY = "StateAssembly",
    LOCAL_GOVERNMENT = "LocalGovernment"
}
interface ElectionAttributes {
    id: string;
    electionName: string;
    electionType: string;
    startDate: Date;
    endDate: Date;
    description: string | null;
    isActive: boolean;
    status: ElectionStatus;
    eligibilityRules: any | null;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    resultsPublished?: boolean;
    resultsPublishedAt?: Date;
    preliminaryResultsPublished?: boolean;
    preliminaryResultsPublishedAt?: Date;
    publicKeyFingerprint?: string;
}
interface ElectionCreationAttributes extends Optional<ElectionAttributes, 'id' | 'description' | 'isActive' | 'status' | 'eligibilityRules' | 'createdAt' | 'updatedAt' | 'resultsPublished' | 'resultsPublishedAt' | 'preliminaryResultsPublished' | 'preliminaryResultsPublishedAt'> {
}
declare class Election extends Model<ElectionAttributes, ElectionCreationAttributes> implements ElectionAttributes {
    id: string;
    electionName: string;
    electionType: string;
    startDate: Date;
    endDate: Date;
    description: string | null;
    isActive: boolean;
    status: ElectionStatus;
    eligibilityRules: any | null;
    createdBy: string;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    resultsPublished?: boolean;
    resultsPublishedAt?: Date;
    preliminaryResultsPublished?: boolean;
    preliminaryResultsPublishedAt?: Date;
    publicKeyFingerprint?: string;
    candidates?: Candidate[];
    votes?: Vote[];
    stats?: ElectionStats;
    creator?: AdminUser;
    static associate(models: any): void;
    static initialize(sequelize: Sequelize): typeof Election;
}
export default Election;
