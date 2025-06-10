import { Request, Response, NextFunction } from 'express';
/**
 * Step 1: Voter login request with NIN and VIN
 * This will generate and send OTP to the voter's registered email
 */
export declare const requestVoterLogin: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Step 2: Verify OTP and complete login
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
