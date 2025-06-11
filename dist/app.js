"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const morgan_1 = __importDefault(require("morgan"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const hpp_1 = __importDefault(require("hpp"));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const xss = require('xss-clean');
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const path_1 = __importDefault(require("path"));
const server_1 = __importDefault(require("./config/server"));
const swagger_1 = __importDefault(require("./config/swagger"));
const logger_1 = require("./config/logger");
const routes_1 = __importDefault(require("./routes"));
const errorHandler_1 = require("./middleware/errorHandler");
const app = (0, express_1.default)();
// Security middleware
app.use((0, helmet_1.default)()); // Set security HTTP headers
app.use(xss()); // Sanitize user input
app.use((0, hpp_1.default)()); // Prevent HTTP parameter pollution
// Enable CORS
app.use((0, cors_1.default)({
    origin: server_1.default.corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));
// Health check endpoint (before rate limiting)
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'UP',
        version: process.env.npm_package_version || '1.0.0',
        timestamp: new Date().toISOString(),
    });
});
// Apply rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: server_1.default.rateLimitWindowMs,
    max: server_1.default.rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many requests from this IP, please try again later.',
    },
});
app.use(limiter);
// Request logging
app.use((0, morgan_1.default)('combined', { stream: logger_1.stream }));
// Parse JSON bodies
app.use(express_1.default.json({ limit: '10mb' }));
// Parse URL-encoded bodies
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Compress response bodies
app.use((0, compression_1.default)());
// API routes
const apiPrefix = `${server_1.default.apiPrefix}/${server_1.default.apiVersion}`;
app.use(apiPrefix, routes_1.default);
// Swagger documentation
app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.default));
// Expose Swagger JSON
app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swagger_1.default);
});
// Serve static files
app.use('/static', express_1.default.static(path_1.default.join(__dirname, 'public')));
// Error handling
app.use(errorHandler_1.errorHandler);
// Handle 404 errors
app.use((req, res) => {
    res.status(404).json({
        code: 'NOT_FOUND',
        message: `Route ${req.method} ${req.url} not found`,
    });
});
exports.default = app;
//# sourceMappingURL=app.js.map