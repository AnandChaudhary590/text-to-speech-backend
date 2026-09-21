import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import prisma from "../services/prismaService";
import { generateToken, generateRefreshToken } from "../utils/jwt";
import { AuthRequest } from "../middleware/authMiddleware";
import { createPasswordResetToken } from "../services/passwordResetService";
import { sendPasswordResetEmail } from "../services/emailService";
import {
  verifyPasswordResetToken,
  deletePasswordResetToken,
} from "../services/passwordResetService";

// ==============================
// REGISTER
// ==============================

export const register = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { name, email, phone, password } = req.body;

    // Required fields
    if (!name || !email || !phone || !password) {
      res.status(400).json({
        success: false,
        message: "Name, email, phone and password are required",
      });
      return;
    }

    const trimmedName = name.trim();
    const normalizedEmail = email.toLowerCase().trim();
    const trimmedPhone = String(phone).trim();

    // Name validation - numbers are not allowed
    if (/\d/.test(trimmedName)) {
      res.status(400).json({
        success: false,
        message: "Name must not contain numbers",
      });
      return;
    }

    // Name should contain at least letters
    if (!/^[A-Za-z\s]+$/.test(trimmedName)) {
      res.status(400).json({
        success: false,
        message: "Name can contain only letters and spaces",
      });
      return;
    }

    // Phone validation - numbers only
    if (!/^\d+$/.test(trimmedPhone)) {
      res.status(400).json({
        success: false,
        message: "Phone number must contain only numbers",
      });
      return;
    }

    // Password minimum length
    if (password.length < 8) {
      res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters",
      });
      return;
    }

    // Password must contain at least one number
    if (!/\d/.test(password)) {
      res.status(400).json({
        success: false,
        message: "Password must contain at least one number",
      });
      return;
    }

    // Check existing email
    const existingUser = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (existingUser) {
      res.status(409).json({
        success: false,
        message: "Email already registered",
      });
      return;
    }

    // Check existing phone
    const existingPhone = await prisma.user.findUnique({
      where: {
        phone: trimmedPhone,
      },
    });

    if (existingPhone) {
      res.status(409).json({
        success: false,
        message: "Phone number already registered",
      });
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        name: trimmedName,
        email: normalizedEmail,
        phone: trimmedPhone,
        passwordHash,
      },
    });

    const token = generateToken(
  user.id,
  user.role
);

    res.status(201).json({
      success: true,
      message: "Registration successful",
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          plan: user.plan,
        },
        token,
      },
    });
  } catch (error) {
    console.error("Register error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
// ==============================
// LOGIN
// ==============================

export const login = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({
        success: false,
        message: "Your account is inactive",
      });
      return;
    }

    const passwordMatch = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!passwordMatch) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
      return;
    }

    const token = generateToken(
  user.id,
  user.role
);
    // Generate refresh token
    const refreshToken = generateRefreshToken(user.id);

    // Save refresh token in database
    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        expiresAt: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ),
      },
    });

    res.cookie("refreshToken", refreshToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 30 * 24 * 60 * 60 * 1000,
});

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          plan: user.plan,
        },
        token,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// ==============================
// GET CURRENT USER
// ==============================

export const getMe = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: {
        id: req.user.userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        plan: true,
        isActive: true,
        isVerified: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        user,
      },
    });
  } catch (error) {
    console.error("Get me error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// ==============================
// REFRESH ACCESS TOKEN
// ==============================

export const refreshAccessToken = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      res.status(401).json({
        success: false,
        message: "Refresh token required",
      });
      return;
    }

    const session = await prisma.session.findUnique({
      where: {
        refreshToken,
      },
      include: {
        user: true,
      },
    });

    if (!session) {
      res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
      return;
    }

    if (session.expiresAt < new Date()) {
      await prisma.session.delete({
        where: {
          id: session.id,
        },
      });

      res.status(401).json({
        success: false,
        message: "Refresh token expired",
      });
      return;
    }

    if (!session.user.isActive) {
      res.status(403).json({
        success: false,
        message: "Your account is inactive",
      });
      return;
    }

    const newAccessToken = generateToken(
  session.userId,
  session.user.role
);

    res.status(200).json({
      success: true,
      message: "Access token refreshed",
      data: {
        token: newAccessToken,
      },
    });
  } catch (error) {
    console.error("Refresh token error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// ==============================
// LOGOUT
// ==============================

export const logout = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken) {
      await prisma.session.deleteMany({
        where: {
          refreshToken,
        },
      });
    }

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });

    res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    console.error("Logout error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// ==============================
// FORGOT PASSWORD
// ==============================

export const forgotPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        message: "Email is required",
      });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    // Don't reveal whether the email exists
    if (!user) {
      res.status(200).json({
        success: true,
        message:
          "If an account exists with this email, a password reset link has been sent.",
      });
      return;
    }

    const resetToken = await createPasswordResetToken(user.id);

    await sendPasswordResetEmail(user.email, resetToken);

    res.status(200).json({
      success: true,
      message:
        "If an account exists with this email, a password reset link has been sent.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to process password reset request",
    });
  }
};

// ==============================
// RESET PASSWORD
// ==============================

export const resetPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      res.status(400).json({
        success: false,
        message: "Token and new password are required",
      });
      return;
    }

    if (newPassword.length < 8) {
      res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters",
      });
      return;
    }

    const resetToken = await verifyPasswordResetToken(token);

    if (!resetToken) {
      res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: {
        id: resetToken.userId,
      },
      data: {
        passwordHash,
      },
    });

    // Delete token after successful password reset
    await deletePasswordResetToken(resetToken.id);

    // Invalidate existing sessions
    await prisma.session.deleteMany({
      where: {
        userId: resetToken.userId,
      },
    });

    res.status(200).json({
      success: true,
      message: "Password reset successful",
    });
  } catch (error) {
    console.error("Reset password error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to reset password",
    });
  }
};

// ==============================
// UPDATE PROFILE
// ==============================

export const updateProfile = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user?.userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const userId = req.user.userId;
    const { name, phone } = req.body;

    if (!name || !phone) {
      res.status(400).json({
        success: false,
        message: "Name and phone are required",
      });
      return;
    }

    const trimmedName = String(name).trim();
    const trimmedPhone = String(phone).trim();

    // Name validation
    if (!/^[A-Za-z\s]+$/.test(trimmedName)) {
      res.status(400).json({
        success: false,
        message: "Name can contain only letters and spaces",
      });
      return;
    }

    // Phone validation
    if (!/^\d+$/.test(trimmedPhone)) {
      res.status(400).json({
        success: false,
        message: "Phone number must contain only numbers",
      });
      return;
    }

    // Check phone belongs to another user
    const existingPhone = await prisma.user.findFirst({
      where: {
        phone: trimmedPhone,
        NOT: {
          id: userId,
        },
      },
    });

    if (existingPhone) {
      res.status(409).json({
        success: false,
        message: "Phone number already registered",
      });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        name: trimmedName,
        phone: trimmedPhone,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        plan: true,
        isActive: true,
        isVerified: true,
        createdAt: true,
      },
    });

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        user: updatedUser,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to update profile",
    });
  }
};

// ==============================
// CHANGE PASSWORD
// ==============================

export const changePassword = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user?.userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const userId = req.user.userId;

    const {
      currentPassword,
      newPassword,
      confirmPassword,
    } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      res.status(400).json({
        success: false,
        message: "All password fields are required",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      res.status(400).json({
        success: false,
        message: "New password and confirm password do not match",
      });
      return;
    }

    if (newPassword.length < 8) {
      res.status(400).json({
        success: false,
        message: "New password must be at least 8 characters",
      });
      return;
    }

    if (!/\d/.test(newPassword)) {
      res.status(400).json({
        success: false,
        message: "New password must contain at least one number",
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    const passwordMatches = await bcrypt.compare(
      currentPassword,
      user.passwordHash
    );

    if (!passwordMatches) {
      res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
      return;
    }

    const samePassword = await bcrypt.compare(
      newPassword,
      user.passwordHash
    );

    if (samePassword) {
      res.status(400).json({
        success: false,
        message: "New password must be different from current password",
      });
      return;
    }

    const newPasswordHash = await bcrypt.hash(
      newPassword,
      12
    );

    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        passwordHash: newPasswordHash,
      },
    });

    // Invalidate all existing sessions
    await prisma.session.deleteMany({
      where: {
        userId,
      },
    });

    res.status(200).json({
      success: true,
      message:
        "Password changed successfully. Please login again.",
    });
  } catch (error) {
    console.error("Change password error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to change password",
    });
  }
};