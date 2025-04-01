import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import hpp from 'hpp';
import xss from 'xss-clean';
import swaggerUi from 'swagger-ui-express';
import path from 'path';

import serverConfig from './config/server';
import swaggerSpec from './config/swagger';
import { stream } from './config/logger';
import routes from './routes';
import errorHandler from './middleware/errorHandler';

const app: Application = express();

// Security middleware
app.use(helmet()); // Set security HTTP headers
app.use(xss()); // Sanitize user input
app.use(hpp()); // Prevent HTTP parameter pollution

// Enable CORS
app.use(
  cors({
    origin: serverConfig.corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }),
);

// Apply rate limiting
const limiter = rateLimit({
  windowMs: serverConfig.rateLimitWindowMs,
  max: serverConfig.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    code: 'TOO_MANY_REQUESTS',
    message: 'Too many requests from this IP, please try again later.',
  },
});
app.use(limiter);

// Request logging
app.use(morgan('combined', { stream }));

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compress response bodies
app.use(compression());

// API routes
const apiPrefix = `${serverConfig.apiPrefix}/${serverConfig.apiVersion}`;
app.use(apiPrefix, routes);

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Expose Swagger JSON
app.get('/api-docs.json', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Serve static files
app.use('/static', express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'UP',
    version: process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Error handling
app.use(errorHandler);

// Handle 404 errors
app.use((req: Request, res: Response) => {
  res.status(404).json({
    code: 'NOT_FOUND',
    message: `Route ${req.method} ${req.url} not found`,
  });
});

export default app;
