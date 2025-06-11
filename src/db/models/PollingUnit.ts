import { Model, DataTypes, Sequelize, Optional } from 'sequelize';
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

interface PollingUnitCreationAttributes
  extends Optional<
    PollingUnitAttributes,
    | 'id'
    | 'geolocation'
    | 'address'
    | 'latitude'
    | 'longitude'
    | 'registeredVoters'
    | 'assignedOfficer'
    | 'isActive'
    | 'createdAt'
    | 'updatedAt'
  > {}

class PollingUnit
  extends Model<PollingUnitAttributes, PollingUnitCreationAttributes>
  implements PollingUnitAttributes
{
  declare id: string;
  declare pollingUnitCode: string;
  declare pollingUnitName: string;
  declare state: string;
  declare lga: string;
  declare ward: string;
  declare geolocation: any | null;
  declare address: string | null;
  declare latitude?: number | null;
  declare longitude?: number | null;
  declare registeredVoters: number;
  declare assignedOfficer: string | null;
  declare isActive: boolean;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  public officer?: AdminUser;
  public voters?: any[];
  public votes?: Vote[];

  public static associate(models: any): void {
    PollingUnit.hasMany(models.Voter, {
      sourceKey: 'pollingUnitCode',
      foreignKey: 'polling_unit_code',
      as: 'voters',
    });

    PollingUnit.hasMany(models.Vote, {
      foreignKey: 'pollingUnitId',
      sourceKey: 'id',
      as: 'votes',
    });

    PollingUnit.belongsTo(models.AdminUser, {
      foreignKey: 'assignedOfficer',
      targetKey: 'id',
      as: 'officer',
    });
  }

  public static initialize(sequelize: Sequelize): typeof PollingUnit {
    return PollingUnit.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        pollingUnitCode: {
          type: DataTypes.STRING(50),
          allowNull: false,
          unique: true,
          field: 'polling_unit_code',
          validate: {
            notEmpty: true,
          },
        },
        pollingUnitName: {
          type: DataTypes.STRING(100),
          allowNull: false,
          field: 'polling_unit_name',
          validate: {
            notEmpty: true,
          },
        },
        state: {
          type: DataTypes.STRING(50),
          allowNull: false,
          validate: {
            notEmpty: true,
          },
        },
        lga: {
          type: DataTypes.STRING(50),
          allowNull: false,
          validate: {
            notEmpty: true,
          },
        },
        ward: {
          type: DataTypes.STRING(100),
          allowNull: false,
          validate: {
            notEmpty: true,
          },
        },
        geolocation: {
          type: DataTypes.JSONB,
          allowNull: true,
        },
        address: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        latitude: {
          type: DataTypes.FLOAT,
          allowNull: true,
        },
        longitude: {
          type: DataTypes.FLOAT,
          allowNull: true,
        },
        registeredVoters: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: 'registered_voters',
          defaultValue: 0,
          validate: {
            min: 0,
          },
        },
        assignedOfficer: {
          type: DataTypes.UUID,
          allowNull: true,
          field: 'assigned_officer',
          references: {
            model: 'admin_users',
            key: 'id',
          },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
        },
        isActive: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          field: 'is_active',
          defaultValue: true,
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          field: 'created_at',
          defaultValue: DataTypes.NOW,
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          field: 'updated_at',
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize,
        modelName: 'PollingUnit',
        tableName: 'polling_units',
        underscored: true,
        timestamps: true,
        indexes: [
          { unique: true, fields: ['polling_unit_code'] },
          { fields: ['state', 'lga', 'ward'] },
          { fields: ['assigned_officer'] },
          { fields: ['is_active'] },
        ],
      },
    );
  }
}

export default PollingUnit;
