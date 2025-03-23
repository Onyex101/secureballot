import { Model, DataTypes, Sequelize, Optional } from 'sequelize';

interface PollingUnitAttributes {
  id: string;
  pollingUnitCode: string;
  pollingUnitName: string;
  state: string;
  lga: string;
  ward: string;
  geolocation: any | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
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
    | 'assignedOfficer'
    | 'isActive'
    | 'createdAt'
    | 'updatedAt'
  > {}

class PollingUnit
  extends Model<PollingUnitAttributes, PollingUnitCreationAttributes>
  implements PollingUnitAttributes
{
  public id!: string;
  public pollingUnitCode!: string;
  public pollingUnitName!: string;
  public state!: string;
  public lga!: string;
  public ward!: string;
  public geolocation!: any | null;
  public address!: string | null;
  public latitude!: number | null;
  public longitude!: number | null;
  public registeredVoters!: number;
  public assignedOfficer!: string | null;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Timestamps
  public static readonly createdAt = 'createdAt';
  public static readonly updatedAt = 'updatedAt';

  // Model associations
  public static associate(models: any): void {
    PollingUnit.hasMany(models.VoterCard, {
      sourceKey: 'pollingUnitCode',
      foreignKey: 'polling_unit_code',
      as: 'voterCards',
    });

    PollingUnit.hasMany(models.Vote, {
      foreignKey: 'polling_unit_id',
      as: 'votes',
    });

    PollingUnit.belongsTo(models.AdminUser, {
      foreignKey: 'assigned_officer',
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
