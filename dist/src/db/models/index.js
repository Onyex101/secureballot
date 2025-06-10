"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const sequelize_1 = require("sequelize");
const logger_1 = require("../../config/logger");
const database_1 = __importDefault(require("../../config/database"));
const env = process.env.NODE_ENV || 'development';
const dbConfig = database_1.default[env];
// Create Sequelize instance
const sequelize = new sequelize_1.Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: dbConfig.logging,
    ...(env === 'production' ? { dialectOptions: dbConfig.dialectOptions } : {}),
    ...(env === 'production' ? { pool: dbConfig.pool } : {}),
});
const db = {
    sequelize,
    Sequelize: sequelize_1.Sequelize,
};
// Import models dynamically
const modelFiles = fs_1.default.readdirSync(__dirname).filter(file => {
    return (file.indexOf('.') !== 0 &&
        file !== path_1.default.basename(__filename) &&
        (file.endsWith('.ts') || file.endsWith('.js')) &&
        !file.endsWith('.test.ts') &&
        !file.endsWith('.test.js') &&
        !file.endsWith('.d.ts') // Exclude TypeScript declaration files
    );
});
// First pass: Load and initialize all models
for (const file of modelFiles) {
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const modelModule = require(path_1.default.join(__dirname, file));
        const model = modelModule.default;
        // Check if the model has an initialize method
        if (model && typeof model.initialize === 'function') {
            // Initialize the model with sequelize
            const initializedModel = model.initialize(sequelize);
            db[initializedModel.name] = initializedModel;
        }
        else if (model) {
            // If no initialize method, just add the model as is
            db[model.name] = model;
        }
    }
    catch (error) {
        logger_1.logger.error(`Error importing model file ${file}:`, error);
    }
}
// Second pass: Associate models after all models are initialized
Object.keys(db).forEach(modelName => {
    if (db[modelName].associate) {
        db[modelName].associate(db);
    }
});
exports.default = db;
//# sourceMappingURL=index.js.map