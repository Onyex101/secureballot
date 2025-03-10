import { Request, Response, NextFunction } from "express";
import { authService, auditService } from "../../services";
import { ApiError } from "../../middleware/errorHandler";
import { AuditActionType } from "../../db/models/AuditLog";

/**
 * Register a new voter
 * @route POST /api/v1/auth/register
 * @access Public
 */
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { nin, vin, phoneNumber, dateOfBirth, password } = req.body;

    // Check if voter already exists
    const voterExists = await authService.checkVoterExists(nin, vin);
    if (voterExists) {
      const error: ApiError = new Error(
        "Voter with this NIN or VIN already exists",
      );
      error.statusCode = 409;
      error.code = "VOTER_EXISTS";
      error.isOperational = true;
      throw error;
    }

    // Register new voter
    const voter = await authService.registerVoter(
      nin,
      vin,
      phoneNumber,
      new Date(dateOfBirth),
      password
    );

    // Log the registration
    await auditService.createAuditLog(
      voter.id,
      AuditActionType.REGISTRATION,
      req.ip || '',
      req.headers['user-agent'] || '',
      { nin, phoneNumber }
    );

    res.status(201).json({
      success: true,
      message: "Voter registered successfully",
      data: {
        id: voter.id,
        nin: voter.nin,
        vin: voter.vin,
        phoneNumber: voter.phoneNumber,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login a voter
 * @route POST /api/v1/auth/login
 * @access Public
 */
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { identifier, password } = req.body;

    try {
      // Authenticate voter
      const voter = await authService.authenticateVoter(identifier, password);

      // Generate token
      const token = authService.generateToken(voter.id);

      // Log the login
      await auditService.createAuditLog(
        voter.id,
        AuditActionType.LOGIN,
        req.ip || '',
        req.headers['user-agent'] || '',
        { identifier }
      );

      res.status(200).json({
        success: true,
        message: "Login successful",
        data: {
          token,
          voter: {
            id: voter.id,
            nin: voter.nin,
            vin: voter.vin,
            phoneNumber: voter.phoneNumber,
          },
          requiresMfa: voter.requiresMfa,
        },
      });
    } catch (error) {
      // Log failed login attempt
      await auditService.createAuditLog(
        'unknown',
        'login_failed',
        req.ip || '',
        req.headers['user-agent'] || '',
        { identifier, error: (error as Error).message }
      );

      const apiError: ApiError = new Error("Invalid credentials");
      apiError.statusCode = 401;
      apiError.code = "INVALID_CREDENTIALS";
      apiError.isOperational = true;
      throw apiError;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Verify MFA token
 * @route POST /api/v1/auth/verify-mfa
 * @access Public
 */
export const verifyMfa = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { userId, token } = req.body;

    // In a real implementation, you would retrieve the user's MFA secret
    // For now, we'll use a placeholder
    const secret = "PLACEHOLDER_SECRET";

    // Verify the token
    const isValid = authService.verifyMfaToken(secret, token);

    if (!isValid) {
      const error: ApiError = new Error("Invalid MFA token");
      error.statusCode = 401;
      error.code = "INVALID_MFA_TOKEN";
      error.isOperational = true;
      throw error;
    }

    // Generate a new token with extended expiry
    const newToken = authService.generateToken(userId, 'voter', '24h');

    // Log the MFA verification
    await auditService.createAuditLog(
      userId,
      AuditActionType.MFA_VERIFY,
      req.ip || '',
      req.headers['user-agent'] || '',
      { success: true }
    );

    res.status(200).json({
      success: true,
      message: "MFA verification successful",
      data: {
        token: newToken,
      },
    });
  } catch (error) {
    // Log failed MFA attempt
    if (req.body.userId) {
      await auditService.createAuditLog(
        req.body.userId,
        'mfa_verification_failed',
        req.ip || '',
        req.headers['user-agent'] || '',
        { error: (error as Error).message }
      );
    }

    next(error);
  }
};

/**
 * Refresh token
 * @route POST /api/v1/auth/refresh-token
 * @access Private
 */
export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // The user ID should be available from the authentication middleware
    const userId = (req as any).user.id;

    // Generate a new token
    const token = authService.generateToken(userId);

    // Log the token refresh
    await auditService.createAuditLog(
      userId,
      'token_refresh',
      req.ip || '',
      req.headers['user-agent'] || '',
      {}
    );

    res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
      data: {
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout a voter
 * @route POST /api/v1/auth/logout
 * @access Private
 */
export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // The user ID should be available from the authentication middleware
    const userId = (req as any).user.id;

    // Logout the user
    await authService.logoutUser(userId);

    // Log the logout
    await auditService.createAuditLog(
      userId,
      AuditActionType.LOGOUT,
      req.ip || '',
      req.headers['user-agent'] || '',
      {}
    );

    res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Request password reset
 * @route POST /api/v1/auth/forgot-password
 * @access Public
 */
export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email } = req.body;

    try {
      // Generate password reset token
      const result = await authService.generatePasswordResetToken(email);

      // In a real implementation, you would send an email with the token
      // For now, we'll just log it
      console.log(`Password reset token for ${email}: ${result.token}`);

      // Log the password reset request
      await auditService.createAuditLog(
        'unknown', // We don't know the user ID yet
        AuditActionType.PASSWORD_RESET,
        req.ip || '',
        req.headers['user-agent'] || '',
        { email }
      );

      res.status(200).json({
        success: true,
        message: "Password reset instructions sent to your email",
      });
    } catch (error) {
      // Don't reveal if the email exists or not
      res.status(200).json({
        success: true,
        message: "If your email is registered, you will receive password reset instructions",
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Reset password
 * @route POST /api/v1/auth/reset-password
 * @access Public
 */
export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { token, newPassword } = req.body;

    try {
      // Reset the password
      await authService.resetPassword(token, newPassword);

      // Log the password reset
      await auditService.createAuditLog(
        'unknown', // We don't know the user ID yet
        'password_reset_complete',
        req.ip || '',
        req.headers['user-agent'] || '',
        { success: true }
      );

      res.status(200).json({
        success: true,
        message: "Password reset successful",
      });
    } catch (error) {
      const apiError: ApiError = new Error("Invalid or expired token");
      apiError.statusCode = 400;
      apiError.code = "INVALID_TOKEN";
      apiError.isOperational = true;
      throw apiError;
    }
  } catch (error) {
    next(error);
  }
};
