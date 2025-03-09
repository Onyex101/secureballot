import { Request, Response, NextFunction } from "express";
import jwt, { Secret, SignOptions } from "jsonwebtoken";
import bcrypt from "bcrypt";
import speakeasy from "speakeasy";
import crypto from "crypto";
import { Op } from "sequelize";
import db from "../../db/models";
import { logger } from "../../config/logger";
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
    const existingVoter = await db.Voter.findOne({
      where: {
        [Op.or]: [{ nin }, { vin }],
      },
    });

    if (existingVoter) {
      const error: ApiError = new Error(
        "Voter with this NIN or VIN already exists",
      );
      error.statusCode = 409;
      error.code = "VOTER_EXISTS";
      error.isOperational = true;
      throw error;
    }

    // Create new voter
    const voter = await db.Voter.create({
      nin,
      vin,
      phoneNumber,
      dateOfBirth,
      password, // Password will be hashed in the model's beforeCreate hook
    });

    // Create verification status record (unverified by default)
    await db.VerificationStatus.create({
      userId: voter.id,
      state: "pending", // Default state for verification
      isVerified: false,
    });

    // Log the registration action
    await db.AuditLog.create({
      userId: voter.id,
      actionType: AuditActionType.REGISTRATION,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] || "Unknown",
      actionDetails: {
        nin: nin.substring(0, 3) + "********", // Mask sensitive data in logs
        vin: vin.substring(0, 3) + "****************",
        phoneNumber: phoneNumber.substring(0, 4) + "********",
      },
    });

    // Return success response without sensitive data
    res.status(201).json({
      code: "REGISTRATION_SUCCESS",
      message: "Voter registered successfully. Verification required.",
      data: {
        id: voter.id,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login voter
 * @route POST /api/v1/auth/login
 * @access Public
 */
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { nin, vin, password } = req.body;

    // Find voter by NIN and VIN
    const voter = await db.Voter.findOne({
      where: {
        nin,
        vin,
      },
      include: [
        {
          model: db.VerificationStatus,
          as: "verificationStatus",
        },
      ],
    });

    if (!voter) {
      const error: ApiError = new Error("Invalid credentials");
      error.statusCode = 401;
      error.code = "INVALID_CREDENTIALS";
      error.isOperational = true;
      throw error;
    }

    // Check if account is active
    if (!voter.isActive) {
      const error: ApiError = new Error("Account is inactive or suspended");
      error.statusCode = 403;
      error.code = "ACCOUNT_INACTIVE";
      error.isOperational = true;
      throw error;
    }

    // Verify password
    const isPasswordValid = await voter.validatePassword(password);
    if (!isPasswordValid) {
      // Log failed login attempt
      await db.AuditLog.create({
        userId: voter.id,
        actionType: AuditActionType.LOGIN,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"] || "Unknown",
        actionDetails: { status: "failed", reason: "invalid_password" },
        isSuspicious: true,
      });

      const error: ApiError = new Error("Invalid credentials");
      error.statusCode = 401;
      error.code = "INVALID_CREDENTIALS";
      error.isOperational = true;
      throw error;
    }

    // Check if voter is verified
    const isVerified = voter.verificationStatus?.isVerified || false;

    // Generate JWT token
    const token = jwt.sign(
      {
        id: voter.id,
        role: "Voter",
        isVerified,
        permissions: ["view_elections", "cast_vote"],
      },
      Buffer.from(process.env.JWT_SECRET || "default-secret-key"),
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "1d",
      } as SignOptions,
    );

    // Generate refresh token
    const refreshToken = jwt.sign(
      { id: voter.id },
      Buffer.from(process.env.JWT_REFRESH_SECRET || "default-refresh-secret-key"),
      {
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
      } as SignOptions,
    );

    // Update last login
    voter.lastLogin = new Date();
    await voter.save();

    // Log successful login
    await db.AuditLog.create({
      userId: voter.id,
      actionType: AuditActionType.LOGIN,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] || "Unknown",
      actionDetails: { status: "success" },
    });

    // Check if MFA is required
    const requireMfa = process.env.MFA_REQUIRED === "true";

    // Return tokens
    res.status(200).json({
      code: "LOGIN_SUCCESS",
      message: "Login successful",
      data: {
        token,
        refreshToken,
        mfaRequired: requireMfa,
        isVerified,
        userId: voter.id,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify MFA code
 * @route POST /api/v1/auth/verify-mfa
 * @access Public
 */
export const verifyMfa = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { userId, code } = req.body;

    // Find voter by ID
    const voter = await db.Voter.findByPk(userId);

    if (!voter) {
      const error: ApiError = new Error("User not found");
      error.statusCode = 404;
      error.code = "USER_NOT_FOUND";
      error.isOperational = true;
      throw error;
    }

    // Check if account is active
    if (!voter.isActive) {
      const error: ApiError = new Error("Account is inactive or suspended");
      error.statusCode = 403;
      error.code = "ACCOUNT_INACTIVE";
      error.isOperational = true;
      throw error;
    }

    // In a real implementation, you would verify the MFA code against what was sent
    // Here, we're just simulating that process
    const isValid = code === "123456"; // In production, use proper verification

    if (!isValid) {
      // Log failed MFA attempt
      await db.AuditLog.create({
        userId: voter.id,
        actionType: AuditActionType.MFA_VERIFY,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"] || "Unknown",
        actionDetails: { status: "failed", reason: "invalid_code" },
        isSuspicious: true,
      });

      const error: ApiError = new Error("Invalid MFA code");
      error.statusCode = 401;
      error.code = "INVALID_MFA_CODE";
      error.isOperational = true;
      throw error;
    }

    // Get verification status
    const verificationStatus = await db.VerificationStatus.findOne({
      where: { userId: voter.id },
    });

    const isVerified = verificationStatus?.isVerified || false;

    // Generate JWT token with full permissions after MFA
    const token = jwt.sign(
      {
        id: voter.id,
        role: "Voter",
        isVerified,
        permissions: ["view_elections", "cast_vote"],
        mfaVerified: true,
      },
      Buffer.from(process.env.JWT_SECRET || "default-secret-key"),
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "1d",
      } as SignOptions,
    );

    // Log successful MFA verification
    await db.AuditLog.create({
      userId: voter.id,
      actionType: AuditActionType.MFA_VERIFY,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] || "Unknown",
      actionDetails: { status: "success" },
    });

    // Return the new token
    res.status(200).json({
      code: "MFA_VERIFICATION_SUCCESS",
      message: "MFA verification successful",
      data: {
        token,
        isVerified,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh authorization token
 * @route POST /api/v1/auth/refresh-token
 * @access Public
 */
export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      const error: ApiError = new Error("Refresh token is required");
      error.statusCode = 400;
      error.code = "REFRESH_TOKEN_REQUIRED";
      error.isOperational = true;
      throw error;
    }

    // Verify refresh token
    try {
      const decoded = jwt.verify(
        refreshToken,
        Buffer.from(process.env.JWT_REFRESH_SECRET || "default-refresh-secret-key"),
      ) as {
        id: string;
      };

      // Find voter by ID
      const voter = await db.Voter.findByPk(decoded.id, {
        include: [
          {
            model: db.VerificationStatus,
            as: "verificationStatus",
          },
        ],
      });

      if (!voter) {
        const error: ApiError = new Error("Invalid refresh token");
        error.statusCode = 401;
        error.code = "INVALID_REFRESH_TOKEN";
        error.isOperational = true;
        throw error;
      }

      // Check if account is active
      if (!voter.isActive) {
        const error: ApiError = new Error("Account is inactive or suspended");
        error.statusCode = 403;
        error.code = "ACCOUNT_INACTIVE";
        error.isOperational = true;
        throw error;
      }

      const isVerified = voter.verificationStatus?.isVerified || false;

      // Generate new access token
      const newToken = jwt.sign(
        {
          id: voter.id,
          role: "Voter",
          isVerified,
          permissions: ["view_elections", "cast_vote"],
        },
        Buffer.from(process.env.JWT_SECRET || "default-secret-key"),
        {
          expiresIn: process.env.JWT_EXPIRES_IN || "1d",
        } as SignOptions,
      );

      // Return the new token
      res.status(200).json({
        code: "TOKEN_REFRESH_SUCCESS",
        message: "Token refreshed successfully",
        data: {
          token: newToken,
        },
      });
    } catch (err) {
      const error: ApiError = new Error("Invalid or expired refresh token");
      error.statusCode = 401;
      error.code = "INVALID_REFRESH_TOKEN";
      error.isOperational = true;
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Logout user
 * @route POST /api/v1/auth/logout
 * @access Private
 */
export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // In a stateless JWT architecture, we don't actually invalidate tokens
    // Client should discard the token
    // But we can log the logout action

    // Get user ID from request (set by auth middleware)
    const userId = (req as any).user?.id;

    if (userId) {
      // Log logout action
      await db.AuditLog.create({
        userId,
        actionType: AuditActionType.LOGOUT,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"] || "Unknown",
        actionDetails: { status: "success" },
      });
    }

    res.status(200).json({
      code: "LOGOUT_SUCCESS",
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
    const { nin, vin, phoneNumber } = req.body;

    // Find voter by NIN, VIN, and phone number
    const voter = await db.Voter.findOne({
      where: {
        nin,
        vin,
        phoneNumber,
      },
    });

    if (!voter) {
      // Don't reveal that the user doesn't exist for security reasons
      res.status(200).json({
        code: "PASSWORD_RESET_REQUESTED",
        message:
          "If your account exists, a password reset code will be sent to your registered phone number",
      });
      return;
    }

    // Generate a random token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // In production, hash this token before storing
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Set expiry to 1 hour
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + 1);

    // Store token in database
    voter.recoveryToken = hashedToken;
    voter.recoveryTokenExpiry = expiryDate;
    await voter.save();

    // In production, send this token via SMS
    // Here we're just simulating that process
    logger.info(`Password reset token for ${voter.id}: ${resetToken}`);

    // Log password reset request
    await db.AuditLog.create({
      userId: voter.id,
      actionType: AuditActionType.PASSWORD_RESET,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] || "Unknown",
      actionDetails: { status: "requested" },
    });

    res.status(200).json({
      code: "PASSWORD_RESET_REQUESTED",
      message:
        "A password reset code has been sent to your registered phone number",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reset password with token
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

    // Hash the token to compare with the stored hashed token
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Find voter with this token and valid expiry
    const voter = await db.Voter.findOne({
      where: {
        recoveryToken: hashedToken,
        recoveryTokenExpiry: {
          [Op.gt]: new Date(),
        },
      },
    });

    if (!voter) {
      const error: ApiError = new Error("Invalid or expired token");
      error.statusCode = 400;
      error.code = "INVALID_RESET_TOKEN";
      error.isOperational = true;
      throw error;
    }

    // Update password
    await voter.updatePassword(newPassword);

    // Clear reset token and expiry
    voter.recoveryToken = null;
    voter.recoveryTokenExpiry = null;
    await voter.save();

    // Log password reset
    await db.AuditLog.create({
      userId: voter.id,
      actionType: AuditActionType.PASSWORD_RESET,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] || "Unknown",
      actionDetails: { status: "completed" },
    });

    res.status(200).json({
      code: "PASSWORD_RESET_SUCCESS",
      message: "Password has been reset successfully",
    });
  } catch (error) {
    next(error);
  }
};
