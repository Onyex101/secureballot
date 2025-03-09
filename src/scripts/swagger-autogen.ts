import fs from 'fs';
import path from 'path';
import { logger } from '../config/logger';
import swaggerSpec from '../config/swagger';

/**
 * Generate Swagger specification JSON file
 */
const generateSwaggerSpec = async () => {
  try {
    // Create docs directory if it doesn't exist
    const docsDir = path.join(__dirname, '..', 'docs');
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }

    // Write swagger.json file
    const swaggerFilePath = path.join(docsDir, 'swagger.json');
    fs.writeFileSync(swaggerFilePath, JSON.stringify(swaggerSpec, null, 2), 'utf8');

    logger.info(`Swagger specification written to ${swaggerFilePath}`);
    return true;
  } catch (error) {
    logger.error('Error generating Swagger specification:', error);
    return false;
  }
};

// Run the function if this script is executed directly
if (require.main === module) {
  generateSwaggerSpec()
    .then((success) => {
      if (success) {
        logger.info('Swagger generation completed successfully');
        process.exit(0);
      } else {
        logger.error('Swagger generation failed');
        process.exit(1);
      }
    })
    .catch((error) => {
      logger.error('Swagger generation script failed:', error);
      process.exit(1);
    });
}

export default generateSwaggerSpec;