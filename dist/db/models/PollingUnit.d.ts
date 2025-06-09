import { Model, Sequelize, Optional } from 'sequelize';
import AdminUser from './AdminUser';
import Vote from './Vote';
interface PollingUnitAttributes {
    id: string;
    pollingUnitCode: string;
    pollingUnitName: string;
    state: string;
    lga: string;
    ward: string;
    geolocation: any | null;
    address: string | null;
    latitude?: number | null;
    longitude?: number | null;
    registeredVoters: number;
    assignedOfficer: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
interface PollingUnitCreationAttributes extends Optional<PollingUnitAttributes, 'id' | 'geolocation' | 'address' | 'latitude' | 'longitude' | 'registeredVoters' | 'assignedOfficer' | 'isActive' | 'createdAt' | 'updatedAt'> {
}
declare class PollingUnit extends Model<PollingUnitAttributes, PollingUnitCreationAttributes> implements PollingUnitAttributes {
    id: string;
    pollingUnitCode: string;
    pollingUnitName: string;
    state: string;
    lga: string;
    ward: string;
    geolocation: any | null;
    address: string | null;
    latitude?: number | null;
    longitude?: number | null;
    registeredVoters: number;
    assignedOfficer: string | null;
    isActive: boolean;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    officer?: AdminUser;
    voters?: any[];
    votes?: Vote[];
    static associate(models: any): void;
    static initialize(sequelize: Sequelize): typeof PollingUnit;
}
export default PollingUnit;
