/* eslint-disable no-return-await */
import { Model, DataTypes, Sequelize, Optional } from 'sequelize';
import bcrypt from 'bcrypt';
import { UserRole } from '../../types/auth';
import { encryptIdentity, decryptIdentity } from '../../services/encryptionService';
import AdminRole from './AdminRole';
import AdminPermission from './AdminPermission';
import AuditLog from './AuditLog'; // Correct import name
import PollingUnit from './PollingUnit'; // Add missing imports for associations
import Election from './Election';
// import ObserverReport from './ObserverReport'; // Add if ObserverReport model exists

interface AdminUserAttributes {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  passwordHash: string;
  adminType: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLogin: Date | null;
  createdBy: string | null;
  recoveryToken: string | null;
  recoveryTokenExpiry: Date | null;
  mfaSecret: string | null;
  mfaEnabled: boolean;
  mfaBackupCodes: string[] | null;
  ninEncrypted: string | null;
}

interface AdminUserCreationAttributes
  extends Optional<
    AdminUserAttributes,
    | 'id'
    | 'isActive'
    | 'createdAt'
    | 'updatedAt'
    | 'lastLogin'
    | 'createdBy'
    | 'recoveryToken'
    | 'recoveryTokenExpiry'
    | 'mfaSecret'
    | 'mfaEnabled'
    | 'mfaBackupCodes'
    | 'ninEncrypted'
  > {
  password: string;
  nin?: string; // Virtual field for input
}

// Remove @Table decorator
class AdminUser
  extends Model<AdminUserAttributes, AdminUserCreationAttributes>
  implements AdminUserAttributes
{
  // Remove decorators
  public id!: string;
  public fullName!: string;
  public email!: string;
  public phoneNumber!: string;
  public passwordHash!: string;
  public adminType!: UserRole;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public lastLogin!: Date | null;
  public createdBy!: string | null;
  public recoveryToken!: string | null;
  public recoveryTokenExpiry!: Date | null;
  public mfaSecret!: string | null;
  public mfaEnabled!: boolean;
  public mfaBackupCodes!: string[] | null;
  public ninEncrypted!: string | null;

  // Associations (defined in associate method)
  public roles?: AdminRole[];
  public permissions?: AdminPermission[];
  public auditLogs?: AuditLog[]; // Correct property name
  public assignedPollingUnits?: PollingUnit[];
  // public observerReports?: ObserverReport[];
  // public reviewedReports?: ObserverReport[];
  public createdElections?: Election[];
  public creator?: AdminUser;
  public createdUsers?: AdminUser[];

  // Virtual fields
  public password?: string;
  public nin?: string;

  // Getter method to decrypt NIN when accessed
  public get decryptedNin(): string | null {
    if (!this.ninEncrypted) return null;
    try {
      return decryptIdentity(this.ninEncrypted);
    } catch (error) {
      return null;
    }
  }

  // Password validation and hashing (keep static hash method if used elsewhere)
  public static hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  public validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.passwordHash);
  }

  // Re-add static associate method
  public static associate(models: any): void {
    AdminUser.hasMany(models.AdminRole, {
      foreignKey: 'adminId',
      sourceKey: 'id',
      as: 'roles',
    });

    AdminUser.hasMany(models.AdminPermission, {
      foreignKey: 'adminId',
      sourceKey: 'id',
      as: 'permissions',
    });

    AdminUser.hasMany(models.AuditLog, {
      // Correct model name
      foreignKey: 'adminId',
      sourceKey: 'id',
      as: 'auditLogs', // Correct alias
    });

    AdminUser.hasMany(models.PollingUnit, {
      foreignKey: 'assignedOfficer',
      sourceKey: 'id',
      as: 'assignedPollingUnits',
    });

    AdminUser.hasMany(models.ObserverReport, {
      foreignKey: 'observer_id',
      as: 'observerReports',
    });

    AdminUser.hasMany(models.ObserverReport, {
      foreignKey: 'reviewed_by',
      as: 'reviewedReports',
    });

    AdminUser.hasMany(models.Election, {
      foreignKey: 'createdBy',
      sourceKey: 'id',
      as: 'createdElections',
    });

    AdminUser.belongsTo(models.AdminUser, {
      foreignKey: 'createdBy',
      targetKey: 'id',
      as: 'creator',
    });

    AdminUser.hasMany(models.AdminUser, {
      foreignKey: 'createdBy',
      sourceKey: 'id',
      as: 'createdUsers',
    });
  }

  // Re-add static initialize method
  public static initialize(sequelize: Sequelize): typeof AdminUser {
    return AdminUser.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        fullName: {
          type: DataTypes.STRING(100),
          allowNull: false,
          field: 'full_name',
          validate: {
            notEmpty: true,
          },
        },
        email: {
          type: DataTypes.STRING(100),
          allowNull: false,
          unique: true,
          validate: {
            isEmail: true,
            notEmpty: true,
          },
        },
        phoneNumber: {
          type: DataTypes.STRING(15),
          allowNull: false,
          field: 'phone_number',
          unique: true,
          validate: {
            is: /^\+?[0-9]{10,15}$/,
            notEmpty: true,
          },
        },
        passwordHash: {
          type: DataTypes.STRING(255),
          allowNull: false,
          field: 'password_hash',
        },
        adminType: {
          type: DataTypes.STRING(50),
          allowNull: false,
          field: 'admin_type',
          validate: {
            isIn: [Object.values(UserRole)], // Ensure UserRole is accessible
          },
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
        lastLogin: {
          type: DataTypes.DATE,
          allowNull: true,
          field: 'last_login',
        },
        createdBy: {
          type: DataTypes.UUID,
          allowNull: true,
          field: 'created_by',
          references: {
            model: 'admin_users',
            key: 'id',
          },
          onDelete: 'SET NULL', // Match SQL
          onUpdate: 'CASCADE',
        },
        recoveryToken: {
          type: DataTypes.STRING(255),
          allowNull: true,
          field: 'recovery_token',
        },
        recoveryTokenExpiry: {
          type: DataTypes.DATE,
          allowNull: true,
          field: 'recovery_token_expiry',
        },
        mfaSecret: {
          type: DataTypes.STRING(255),
          allowNull: true,
          field: 'mfa_secret',
        },
        mfaEnabled: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          field: 'mfa_enabled',
          defaultValue: false,
        },
        mfaBackupCodes: {
          type: DataTypes.ARRAY(DataTypes.STRING),
          allowNull: true,
          field: 'mfa_backup_codes',
        },
        // New authentication fields
        ninEncrypted: {
          field: 'nin_encrypted',
          type: DataTypes.STRING(255),
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: 'AdminUser',
        tableName: 'admin_users',
        timestamps: true,
        underscored: true,
        hooks: {
          beforeCreate: async (user: AdminUser) => {
            if (user.password) {
              user.passwordHash = await AdminUser.hashPassword(user.password);
              user.password = undefined;
            }

            // Encrypt NIN before creation
            if (user.nin) {
              user.ninEncrypted = encryptIdentity(user.nin);
              delete user.nin; // Remove virtual field after encryption
            }
          },
          beforeUpdate: async (user: AdminUser) => {
            // Only hash if password is provided and changed
            if (user.password && user.changed('passwordHash') === false) {
              user.passwordHash = await AdminUser.hashPassword(user.password);
              user.password = undefined;
            }

            // Encrypt NIN on update if provided
            if (user.nin) {
              user.ninEncrypted = encryptIdentity(user.nin);
              delete user.nin; // Remove virtual field after encryption
            }
          },
        },
      },
    );
  }
}

export default AdminUser;
