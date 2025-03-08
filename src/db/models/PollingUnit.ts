import { Model, DataTypes, Sequelize, Optional } from "sequelize";

interface PollingUnitAttributes {
  id: string;
  pollingUnitCode: string;
  pollingUnitName: string;
  state: string;
  lga: string;
  ward: string;
  geolocation: any | null;
  address: string | null;
  registeredVoters: number;
  assignedOfficer: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface PollingUnitCreationAttributes
  extends Optional<
    PollingUnitAttributes,
    | "id"
    | "geolocation"
    | "address"
    | "assignedOfficer"
    | "isActive"
    | "createdAt"
    | "updatedAt"
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
  public registeredVoters!: number;
  public assignedOfficer!: string | null;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Timestamps
  public static readonly createdAt = "createdAt";
  public static readonly updatedAt = "updatedAt";

  // Model associations
  public static associate(models: any): void {
    PollingUnit.hasMany(models.VoterCard, {
      sourceKey: "pollingUnitCode",
      foreignKey: "pollingUnitCode",
      as: "voterCards",
    });

    PollingUnit.hasMany(models.Vote, {
      foreignKey: "pollingUnitId",
      as: "votes",
    });

    PollingUnit.belongsTo(models.AdminUser, {
      foreignKey: "assignedOfficer",
      as: "officer",
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
          validate: {
            notEmpty: true,
          },
        },
        pollingUnitName: {
          type: DataTypes.STRING(100),
          allowNull: false,
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
        registeredVoters: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          validate: {
            min: 0,
          },
        },
        assignedOfficer: {
          type: DataTypes.UUID,
          allowNull: true,
          references: {
            model: "admin_users",
            key: "id",
          },
          onDelete: "SET NULL",
          onUpdate: "CASCADE",
        },
        isActive: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize,
        modelName: "PollingUnit",
        tableName: "polling_units",
        underscored: false,
        timestamps: true,
        indexes: [
          { unique: true, fields: ["pollingUnitCode"] },
          { fields: ["state", "lga", "ward"] },
          { fields: ["assignedOfficer"] },
          { fields: ["isActive"] },
        ],
      },
    );
  }
}

export default PollingUnit;
