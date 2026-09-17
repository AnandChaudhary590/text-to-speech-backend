import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import prisma from "../services/prismaService";
import { generateToken, generateRefreshToken } from "../utils/jwt";
import { AuthRequest } from "../middleware/authMiddleware";

// ==============================
// REGISTER
// ==============================

export const register = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters",
      });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

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

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
      },
    });

    const token = generateToken(user.id);

    res.status(201).json({
      success: true,
      message: "Registration successful",
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

    const token = generateToken(user.id);

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

    const newAccessToken = generateToken(session.userId);

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