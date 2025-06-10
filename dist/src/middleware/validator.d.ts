import { Request, Response, NextFunction } from 'express';
import { ValidationChain } from 'express-validator';
/**
 * Middleware to validate request using express-validator rules
 * @param validations array of validation rules
 */
export declare const validate: (validations: ValidationChain[]) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Middleware to sanitize request data
 */
export declare const sanitize: () => (req: Request, res: Response, next: NextFunction) => void;
/**
 * Utility for creating validation error messages
 */
export declare const validationMessages: {
    required: (field: string) => string;
    min: (field: string, min: number) => string;
    max: (field: string, max: number) => string;
    email: (field?: string) => string;
    numeric: (field: string) => string;
    alpha: (field: string) => string;
    alphanumeric: (field: string) => string;
    date: (field: string) => string;
    boolean: (field: string) => string;
    in: (field: string, values: any[]) => string;
    equals: (field: string, value: any) => string;
    uuid: (field: string) => string;
    url: (field: string) => string;
    password: () => string;
    nin: () => string;
    vin: () => string;
    phoneNumber: () => string;
};
export declare const validateRequest: (schema: any) => (req: Request, res: Response, next: NextFunction) => void;
export declare const ninValidation: () => ValidationChain;
export declare const vinValidation: () => ValidationChain;
export declare const phoneValidation: () => ValidationChain;
export declare const emailValidation: () => ValidationChain;
