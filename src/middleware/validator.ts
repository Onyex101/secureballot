import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain, body } from 'express-validator';
import { ApiError } from './errorHandler';

/**
 * Middleware to validate request using express-validator rules
 * @param validations array of validation rules
 */
export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Execute all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    // Get validation errors
    const errors = validationResult(req);

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
    const error = new ApiError(400, 'Validation error', 'VALIDATION_ERROR', formattedErrors);
    next(error);
  };
};

/**
 * Middleware to sanitize request data
 */
export const sanitize = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Basic sanitization logic
    if (req.body) {
      // Recursively sanitize object properties
      const sanitizeObject = (obj: any): any => {
        if (typeof obj !== 'object' || obj === null) {
          return obj;
        }

        // Handle arrays
        if (Array.isArray(obj)) {
          return obj.map(item => sanitizeObject(item));
        }

        // Handle objects
        const sanitized: any = {};
        for (const [key, value] of Object.entries(obj)) {
          if (typeof value === 'string') {
            // Sanitize string values (basic example)
            sanitized[key] = value.trim();
          } else if (typeof value === 'object' && value !== null) {
            // Recursively sanitize nested objects
            sanitized[key] = sanitizeObject(value);
          } else {
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

/**
 * Utility for creating validation error messages
 */
export const validationMessages = {
  required: (field: string) => `${field} is required`,
  min: (field: string, min: number) => `${field} must be at least ${min} characters`,
  max: (field: string, max: number) => `${field} must be at most ${max} characters`,
  email: (field: string = 'Email') => `${field} must be a valid email address`,
  numeric: (field: string) => `${field} must be a number`,
  alpha: (field: string) => `${field} must contain only letters`,
  alphanumeric: (field: string) => `${field} must contain only letters and numbers`,
  date: (field: string) => `${field} must be a valid date`,
  boolean: (field: string) => `${field} must be a boolean value`,
  in: (field: string, values: any[]) => `${field} must be one of: ${values.join(', ')}`,
  equals: (field: string, value: any) => `${field} must be ${value}`,
  uuid: (field: string) => `${field} must be a valid UUID`,
  url: (field: string) => `${field} must be a valid URL`,
  password: () =>
    'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  nin: () => 'National Identification Number (NIN) must be exactly 11 characters',
  vin: () => 'Voter Identification Number (VIN) must be exactly 19 characters',
  phoneNumber: () => 'Phone number must be a valid Nigerian phone number (e.g., +234XXXXXXXXXX)',
};

export const validateRequest = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error } = schema.validate(req.body);
      if (error) {
        throw new ApiError(400, error.details[0].message, 'VALIDATION_ERROR');
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Standard validation rules for common fields
export const ninValidation = (): ValidationChain =>
  body('nin')
    .notEmpty()
    .withMessage('NIN is required')
    .isNumeric()
    .withMessage('NIN must contain only numbers')
    .isLength({ min: 11, max: 11 })
    .withMessage('NIN must be exactly 11 digits');

export const vinValidation = (): ValidationChain =>
  body('vin')
    .notEmpty()
    .withMessage('VIN is required')
    .isLength({ min: 19, max: 19 })
    .withMessage('VIN must be exactly 19 characters')
    .matches(/^[A-Z0-9]+$/)
    .withMessage('VIN must contain only uppercase letters and numbers');

export const phoneValidation = (): ValidationChain =>
  body('phoneNumber')
    .notEmpty()
    .withMessage(validationMessages.required('Phone number'))
    .matches(/^\+?[0-9]{10,15}$/)
    .withMessage(validationMessages.phoneNumber());

export const emailValidation = (): ValidationChain =>
  body('email')
    .notEmpty()
    .withMessage(validationMessages.required('Email'))
    .isEmail()
    .withMessage(validationMessages.email());
