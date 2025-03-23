import { Model, DataTypes, Sequelize, Optional } from 'sequelize';

interface VoterCardAttributes {
  id: string;
  userId: string;
  fullName: string;
  vin: string;
  pollingUnitCode: string;
  state: string;
  lga: string;
  ward: string;
  issuedDate: Date;
  isValid: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface VoterCardCreationAttributes
  extends Optional<
    VoterCardAttributes,
    'id' | 'issuedDate' | 'isValid' | 'createdAt' | 'updatedAt'
  > {}

class VoterCard
  extends Model<VoterCardAttributes, VoterCardCreationAttributes>
  implements VoterCardAttributes
{
  public id!: string;
  public userId!: string;
  public fullName!: string;
  public vin!: string;
  public pollingUnitCode!: string;
  public state!: string;
  public lga!: string;
  public ward!: string;
  public issuedDate!: Date;
  public isValid!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Timestamps
  public static readonly createdAt = 'createdAt';
  public static readonly updatedAt = 'updatedAt';

  // Model associations
  public static associate(models: any): void {
    VoterCard.belongsTo(models.Voter, {
      foreignKey: 'user_id',
      as: 'voter',
    });

    VoterCard.belongsTo(models.PollingUnit, {
      foreignKey: 'polling_unit_code',
      targetKey: 'pollingUnitCode',
      as: 'polling_unit',
    });
  }

  public static initialize(sequelize: Sequelize): typeof VoterCard {
    return VoterCard.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        userId: {
          field: 'user_id',
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'voters',
            key: 'id',
          },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        fullName: {
          field: 'full_name',
          type: DataTypes.STRING(100),
          allowNull: false,
          validate: {
            notEmpty: true,
          },
        },
        vin: {
          type: DataTypes.STRING(19),
          allowNull: false,
          unique: true,
          validate: {
            len: [19, 19],
            notEmpty: true,
          },
        },
        pollingUnitCode: {
          field: 'polling_unit_code',
          type: DataTypes.STRING(50),
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
        issuedDate: {
          field: 'issued_date',
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        isValid: {
          field: 'is_valid',
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        createdAt: {
          field: 'created_at',
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        updatedAt: {
          field: 'updated_at',
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize,
        modelName: 'VoterCard',
        tableName: 'voter_cards',
        underscored: false,
        timestamps: true,
        indexes: [
          { unique: true, fields: ['vin'] },
          { fields: ['user_id'] },
          { fields: ['polling_unit_code'] },
          { fields: ['state', 'lga', 'ward'] },
        ],
      },
    );
  }
}

export default VoterCard;
