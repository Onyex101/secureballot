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

interface VoterCardCreationAttributes extends Optional<VoterCardAttributes, 'id' | 'issuedDate' | 'isValid' | 'createdAt' | 'updatedAt'> {}

class VoterCard extends Model<VoterCardAttributes, VoterCardCreationAttributes> implements VoterCardAttributes {
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
      foreignKey: 'userId',
      as: 'voter',
    });

    VoterCard.belongsTo(models.PollingUnit, {
      foreignKey: 'pollingUnitCode',
      targetKey: 'pollingUnitCode',
      as: 'pollingUnit',
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
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        isValid: {
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
        modelName: 'VoterCard',
        tableName: 'voter_cards',
        underscored: false,
        timestamps: true,
        indexes: [
          { unique: true, fields: ['vin'] },
          { fields: ['userId'] },
          { fields: ['pollingUnitCode'] },
          { fields: ['state', 'lga', 'ward'] },
        ],
      }
    );
  }
}

export default VoterCard;