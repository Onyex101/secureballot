"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const database_1 = __importDefault(require("./database"));
const server_1 = __importDefault(require("./server"));
const swagger_1 = __importDefault(require("./swagger"));
exports.config = {
    database: database_1.default,
    server: server_1.default,
    swagger: swagger_1.default,
    jwt: {
        secret: process.env.JWT_SECRET || 'your-secret-key',
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    },
};
//# sourceMappingURL=index.js.map