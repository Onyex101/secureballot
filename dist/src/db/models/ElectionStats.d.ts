import { Model, Sequelize, Optional } from 'sequelize';
interface ElectionStatsAttributes {
    id: string;
    electionId: string;
    totalVotes: number;
    validVotes: number;
    invalidVotes: number;
    turnoutPercentage: number;
    lastUpdated: Date;
    createdAt: Date;
    updatedAt: Date;
}
interface ElectionStatsCreationAttributes extends Optional<ElectionStatsAttributes, 'id' | 'totalVotes' | 'validVotes' | 'invalidVotes' | 'turnoutPercentage' | 'lastUpdated' | 'createdAt' | 'updatedAt'> {
}
declare class ElectionStats extends Model<ElectionStatsAttributes, ElectionStatsCreationAttributes> implements ElectionStatsAttributes {
    id: string;
    electionId: string;
    totalVotes: number;
    validVotes: number;
    invalidVotes: number;
    turnoutPercentage: number;
    lastUpdated: Date;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    static readonly createdAt = "createdAt";
    static readonly updatedAt = "updatedAt";
    static associate(models: any): void;
    static initialize(sequelize: Sequelize): typeof ElectionStats;
}
export default ElectionStats;
