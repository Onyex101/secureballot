import fs from "fs";
import path from "path";
import { Sequelize, DataTypes } from "sequelize";
import { logger } from "../../config/logger";
import config from "../../config/database";

const env = process.env.NODE_ENV || "development";
const dbConfig = config[env as keyof typeof config];

// Create Sequelize instance
const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: dbConfig.logging,
    ...(env === "production"
      ? { dialectOptions: dbConfig.dialectOptions }
      : {}),
    ...(env === "production" ? { pool: dbConfig.pool } : {}),
  },
);

const db: {
  sequelize: Sequelize;
  Sequelize: typeof Sequelize;
  [key: string]: any;
} = {
  sequelize,
  Sequelize,
};

// Import models dynamically
const modelFiles = fs.readdirSync(__dirname).filter((file) => {
  return (
    file.indexOf(".") !== 0 &&
    file !== path.basename(__filename) &&
    (file.endsWith(".ts") || file.endsWith(".js")) &&
    !file.endsWith(".test.ts") &&
    !file.endsWith(".test.js")
  );
});

// Load models
for (const file of modelFiles) {
  try {
    const model = require(path.join(__dirname, file)).default;
    db[model.name] = model;
  } catch (error) {
    logger.error(`Error importing model file ${file}:`, error);
  }
}

// Associate models
Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

export default db;
