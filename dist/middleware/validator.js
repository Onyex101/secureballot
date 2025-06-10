"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailValidation = exports.phoneValidation = exports.vinValidation = exports.ninValidation = exports.validateRequest = exports.validationMessages = exports.sanitize = exports.validate = void 0;
const express_validator_1 = require("express-validator");
const errorHandler_1 = require("./errorHandler");
/**
 * Middleware to validate request using express-validator rules
 * @param validations array of validation rules
 */
const validate = (validations) => {
    return async (req, res, next) => {
        // Execute all validations
        await Promise.all(validations.map(validation => validation.run(req)));
        // Get validation errors
        const errors = (0, express_validator_1.validationResult)(req);
        // Return if no errors
        if (errors.isEmpty()) {
            return next();
        }
        // Format errors
        const formattedErrors = errors.array().map(error => {
            if (error.type === 'field') {
                return {
                    field: error.path,
                    message: error.msg,
                    value: error.value,
                };
            }
            // For other error types
            return {
                field: 'unknown',
                message: error.msg,
                value: undefined,
            };
        });
        // Create API error
        const error = new errorHandler_1.ApiError(400, 'Validation error', 'VALIDATION_ERROR', formattedErrors);
        next(error);
    };
};
exports.validate = validate;
/**
 * Middleware to sanitize request data
 */
const sanitize = () => {
    return (req, res, next) => {
        // Basic sanitization logic
        if (req.body) {
            // Recursively sanitize object properties
            const sanitizeObject = (obj) => {
                if (typeof obj !== 'object' || obj === null) {
                    return obj;
                }
                // Handle arrays
                if (Array.isArray(obj)) {
                    return obj.map(item => sanitizeObject(item));
                }
                // Handle objects
                const sanitized = {};
                for (const [key, value] of Object.entries(obj)) {
                    if (typeof value === 'string') {
                        // Sanitize string values (basic example)
                        sanitized[key] = value.trim();
                    }
                    else if (typeof value === 'object' && value !== null) {
                        // Recursively sanitize nested objects
                        sanitized[key] = sanitizeObject(value);
                    }
                    else {
                        // Pass through other types (numbers, booleans, etc.)
                        sanitized[key] = value;
                    }
                }
                return sanitized;
            };
            req.body = sanitizeObject(req.body);
        }
        next();
    };
};
exports.sanitize = sanitize;
/**
 * Utility for creating validation error messages
 */
exports.validationMessages = {
    required: (field) => `${field} is required`,
    min: (field, min) => `${field} must be at least ${min} characters`,
    max: (field, max) => `${field} must be at most ${max} characters`,
    email: (field = 'Email') => `${field} must be a valid email address`,
    numeric: (field) => `${field} must be a number`,
    alpha: (field) => `${field} must contain only letters`,
    alphanumeric: (field) => `${field} must contain only letters and numbers`,
    date: (field) => `${field} must be a valid date`,
    boolean: (field) => `${field} must be a boolean value`,
    in: (field, values) => `${field} must be one of: ${values.join(', ')}`,
    equals: (field, value) => `${field} must be ${value}`,
    uuid: (field) => `${field} must be a valid UUID`,
    url: (field) => `${field} must be a valid URL`,
    password: () => 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    nin: () => 'National Identification Number (NIN) must be exactly 11 characters',
    vin: () => 'Voter Identification Number (VIN) must be exactly 19 characters',
    phoneNumber: () => 'Phone number must be a valid Nigerian phone number (e.g., +234XXXXXXXXXX)',
};
const validateRequest = (schema) => {
    return (req, res, next) => {
        try {
            const { error } = schema.validate(req.body);
            if (error) {
                throw new errorHandler_1.ApiError(400, error.details[0].message, 'VALIDATION_ERROR');
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
exports.validateRequest = validateRequest;
// Standard validation rules for common fields
const ninValidation = () => (0, express_validator_1.body)('nin')
    .notEmpty()
    .withMessage('NIN is required')
    .isNumeric()
    .withMessage('NIN must contain only numbers')
    .isLength({ min: 11, max: 11 })
    .withMessage('NIN must be exactly 11 digits');
exports.ninValidation = ninValidation;
const vinValidation = () => (0, express_validator_1.body)('vin')
    .notEmpty()
    .withMessage('VIN is required')
    .isLength({ min: 19, max: 19 })
    .withMessage('VIN must be exactly 19 characters')
    .matches(/^[A-Z0-9]+$/)
    .withMessage('VIN must contain only uppercase letters and numbers');
exports.vinValidation = vinValidation;
const phoneValidation = () => (0, express_validator_1.body)('phoneNumber')
    .notEmpty()
    .withMessage(exports.validationMessages.required('Phone number'))
    .matches(/^\+?[0-9]{10,15}$/)
    .withMessage(exports.validationMessages.phoneNumber());
exports.phoneValidation = phoneValidation;
const emailValidation = () => (0, express_validator_1.body)('email')
    .notEmpty()
    .withMessage(exports.validationMessages.required('Email'))
    .isEmail()
    .withMessage(exports.validationMessages.email());
exports.emailValidation = emailValidation;
//# sourceMappingURL=validator.js.map