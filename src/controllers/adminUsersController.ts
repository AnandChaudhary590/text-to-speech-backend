import { Response } from "express";
import prisma from "../services/prismaService";
import { AuthRequest } from "../middleware/authMiddleware";

export const getAdminUsers = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
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
        updatedAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.status(200).json({
      success: true,
      data: {
        users,
        total: users.length,
      },
    });
  } catch (error) {
    console.error("Get admin users error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to load users",
    });
  }
};

export const updateUserStatus = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      res.status(400).json({
        success: false,
        message: "isActive must be true or false",
      });
      return;
    }

    if (id === req.user?.userId && !isActive) {
      res.status(400).json({
        success: false,
        message: "You cannot deactivate your own account",
      });
      return;
    }

    const user = await prisma.user.update({
      where: {
        id,
      },
      data: {
        isActive,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        plan: true,
        isActive: true,
      },
    });

    res.status(200).json({
      success: true,
      message: `User ${
        isActive ? "activated" : "deactivated"
      } successfully`,
      data: {
        user,
      },
    });
  } catch (error) {
    console.error("Update user status error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to update user status",
    });
  }
};

export const updateUserRole = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { role } = req.body;

    if (role !== "USER" && role !== "ADMIN") {
      res.status(400).json({
        success: false,
        message: "Role must be USER or ADMIN",
      });
      return;
    }

    const user = await prisma.user.update({
      where: {
        id,
      },
      data: {
        role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        plan: true,
        isActive: true,
      },
    });

    res.status(200).json({
      success: true,
      message: "User role updated successfully",
      data: {
        user,
      },
    });
  } catch (error) {
    console.error("Update user role error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to update user role",
    });
  }
};

export const updateUserPlan = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { plan } = req.body;

    const validPlans = [
      "FREE",
      "PRO",
      "ENTERPRISE",
    ];

    if (!validPlans.includes(plan)) {
      res.status(400).json({
        success: false,
        message:
          "Plan must be FREE, PRO or ENTERPRISE",
      });
      return;
    }

    const user = await prisma.user.update({
      where: {
        id,
      },
      data: {
        plan,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        plan: true,
        isActive: true,
      },
    });

    res.status(200).json({
      success: true,
      message: "User plan updated successfully",
      data: {
        user,
      },
    });
  } catch (error) {
    console.error("Update user plan error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to update user plan",
    });
  }
};