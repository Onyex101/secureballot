import winston from 'winston';
declare const logger: winston.Logger;
export declare const logError: (message: string, error?: any) => void;
export declare const logWarn: (message: string, meta?: any) => void;
export declare const logInfo: (message: string, meta?: any) => void;
export declare const logDebug: (message: string, meta?: any) => void;
export default logger;
