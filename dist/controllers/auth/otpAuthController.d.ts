import { Request, Response, NextFunction } from 'express';
/**
 * Step 1: Voter login request with NIN and VIN
 * POC: Returns constant OTP for testing, no email required
 */
export declare const requestVoterLogin: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Step 2: Verify OTP and complete login
 * POC: Accepts constant OTP 723111 or any code in development mode
 */
export declare const verifyOtpAndLogin: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Resend OTP
 */
export declare const resendOtp: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Admin login with NIN and password (no OTP required)
 */
export declare const adminLogin: (req: Request, res: Response, next: NextFunction) => Promise<void>;
