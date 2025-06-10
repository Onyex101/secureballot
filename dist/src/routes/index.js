"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const v1_1 = __importDefault(require("./v1"));
const router = (0, express_1.Router)();
// API version routes - must be defined before the default route
router.use('/', v1_1.default);
// Default route - should only respond to exact '/' path, not all routes
router.get('/', (_req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'Welcome to Nigeria E-Voting API',
        version: '1.0.0',
        apiDocumentation: '/api-docs',
    });
});
exports.default = router;
//# sourceMappingURL=index.js.map