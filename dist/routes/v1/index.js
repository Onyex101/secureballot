"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authRoutes_1 = __importDefault(require("./authRoutes"));
const otpAuthRoutes_1 = __importDefault(require("./otpAuthRoutes"));
const voterRoutes_1 = __importDefault(require("./voterRoutes"));
const electionRoutes_1 = __importDefault(require("./electionRoutes"));
const resultsRoutes_1 = __importDefault(require("./resultsRoutes"));
const ussdRoutes_1 = __importDefault(require("./ussdRoutes"));
const mobileRoutes_1 = __importDefault(require("./mobileRoutes"));
const adminRoutes_1 = __importDefault(require("./adminRoutes"));
const router = (0, express_1.Router)();
// Mount route modules
router.use('/auth', authRoutes_1.default);
router.use('/auth', otpAuthRoutes_1.default); // New OTP-based authentication
router.use('/voter', voterRoutes_1.default);
router.use('/elections', electionRoutes_1.default);
router.use('/results', resultsRoutes_1.default);
router.use('/ussd', ussdRoutes_1.default);
router.use('/mobile', mobileRoutes_1.default);
router.use('/admin', adminRoutes_1.default);
exports.default = router;
//# sourceMappingURL=index.js.map