import { Request, Response, NextFunction } from 'express';
declare class ApiError extends Error {
    statusCode: number;
    code?: string;
    details?: any;
    isOperational: boolean;
    constructor(statusCode: number, message: string, code?: string, details?: any, isOperational?: boolean);
}
declare const errorHandler: (err: Error | ApiError, req: Request, res: Response, next: NextFunction) => void;
export { errorHandler, ApiError };
