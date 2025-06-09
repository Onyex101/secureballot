"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("../config/logger");
const swagger_1 = __importDefault(require("../config/swagger"));
/**
 * Generate Swagger specification JSON file
 */
const generateSwaggerSpec = () => {
    try {
        // Create docs directory if it doesn't exist
        const docsDir = path_1.default.join(__dirname, '..', 'docs');
        if (!fs_1.default.existsSync(docsDir)) {
            fs_1.default.mkdirSync(docsDir, { recursive: true });
        }
        // Write swagger.json file
        const swaggerFilePath = path_1.default.join(docsDir, 'swagger.json');
        fs_1.default.writeFileSync(swaggerFilePath, JSON.stringify(swagger_1.default, null, 2), 'utf8');
        logger_1.logger.info(`Swagger specification written to ${swaggerFilePath}`);
        return Promise.resolve(true);
    }
    catch (error) {
        logger_1.logger.error('Error generating Swagger specification:', error);
        return Promise.resolve(false);
    }
};
// Run the function if this script is executed directly
if (require.main === module) {
    generateSwaggerSpec()
        .then(success => {
        if (success) {
            logger_1.logger.info('Swagger generation completed successfully');
            process.exit(0);
        }
        else {
            logger_1.logger.error('Swagger generation failed');
            process.exit(1);
        }
    })
        .catch(error => {
        logger_1.logger.error('Swagger generation script failed:', error);
        process.exit(1);
    });
}
exports.default = generateSwaggerSpec;
//# sourceMappingURL=swagger-autogen.js.map