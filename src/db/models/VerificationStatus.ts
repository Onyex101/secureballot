import { Model, DataTypes, Sequelize, Optional } from "sequelize";

interface VerificationStatusAttributes {
  id: string;
  userId: string;
  state: string;
  isVerified: boolean;
  verifiedAt: Date | null;
  verificationMethod: string | null;
  verificationNotes: string | null;
  verificationData: any | null;
  createdAt: Date;
  updatedAt: Date;
}

interface VerificationStatusCreationAttributes
  extends Optional<
    VerificationStatusAttributes,
    | "id"
    | "isVerified"
    | "verifiedAt"
    | "verificationMethod"
    | "verificationNotes"
    | "verificationData"
    | "createdAt"
    | "updatedAt"
  > {}

class VerificationStatus
  extends Model<
    VerificationStatusAttributes,
    VerificationStatusCreationAttributes
  >
  implements VerificationStatusAttributes
{
  public id!: string;
  public userId!: string;
  public state!: string;
  public isVerified!: boolean;
  public verifiedAt!: Date | null;
  public verificationMethod!: string | null;
  public verificationNotes!: string | null;
  public verificationData!: any | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Timestamps
  public static readonly createdAt = "createdAt";
  public static readonly updatedAt = "updatedAt";

  // Model associations
  public static associate(models: any): void {
    VerificationStatus.belongsTo(models.Voter, {
      foreignKey: "userId",
      as: "voter",
    });
  }

  public static initialize(sequelize: Sequelize): typeof VerificationStatus {
    return VerificationStatus.init(
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
            model: "voters",
            key: "id",
          },
          onDelete: "CASCADE",
          onUpdate: "CASCADE",
        },
        state: {
          type: DataTypes.STRING(50),
          allowNull: false,
          validate: {
            notEmpty: true,
          },
        },
        isVerified: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        verifiedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        verificationMethod: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },
        verificationNotes: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        verificationData: {
          type: DataTypes.JSON,
          allowNull: true,
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
        modelName: "VerificationStatus",
        tableName: "verification_status",
        underscored: false,
        timestamps: true,
        indexes: [
          { unique: true, fields: ["userId"] },
          { fields: ["state"] },
          { fields: ["isVerified"] },
        ],
        hooks: {
          beforeUpdate: async (verificationStatus: VerificationStatus) => {
            // If status is changing to verified, set the verification time
            if (
              verificationStatus.changed("isVerified") &&
              verificationStatus.isVerified
            ) {
              verificationStatus.verifiedAt = new Date();
            }
          },
        },
      },
    );
  }
}

export default VerificationStatus;
