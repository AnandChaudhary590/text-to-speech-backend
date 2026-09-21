import { Response } from "express";
import prisma from "../services/prismaService";
import { AuthRequest } from "../middleware/authMiddleware";

export const getAdminStats = async (
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

    const [
      totalUsers,
      activeUsers,
      totalSpeeches,
      totalFavorites,
      todayUsage,
    ] = await Promise.all([
      prisma.user.count(),

      prisma.user.count({
        where: {
          isActive: true,
        },
      }),

      prisma.speechGeneration.count(),

      prisma.favorite.count(),

      prisma.usageRecord.aggregate({
        _sum: {
          charactersUsed: true,
          speechCount: true,
          audioSeconds: true,
        },
        where: {
          date: {
            gte: new Date(
              new Date().setHours(0, 0, 0, 0)
            ),
          },
        },
      }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        totalSpeeches,
        totalFavorites,
        todayUsage: {
          charactersUsed:
            todayUsage._sum.charactersUsed || 0,
          speechCount:
            todayUsage._sum.speechCount || 0,
          audioSeconds:
            todayUsage._sum.audioSeconds || 0,
        },
      },
    });
  } catch (error) {
    console.error(
      "Get admin stats error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Unable to load admin statistics",
    });
  }
};