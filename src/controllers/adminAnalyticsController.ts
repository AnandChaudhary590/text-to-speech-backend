import { Response } from "express";
import prisma from "../services/prismaService";
import { AuthRequest } from "../middleware/authMiddleware";

export const getAdminAnalytics = async (
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

    const today = new Date();

    const startOfToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(
      startOfWeek.getDate() - 6
    );

    const startOfMonth = new Date(
      today.getFullYear(),
      today.getMonth(),
      1
    );

    const [
      totalUsers,
      activeUsers,
      totalSpeeches,
      totalFavorites,
      totalCharacters,
      totalAudioSeconds,
      weeklyUsage,
      planDistribution,
      languageDistribution,
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
        },
      }),

      prisma.usageRecord.aggregate({
        _sum: {
          audioSeconds: true,
        },
      }),

      prisma.usageRecord.findMany({
        where: {
          date: {
            gte: startOfWeek,
          },
        },
        select: {
          date: true,
          charactersUsed: true,
          speechCount: true,
          audioSeconds: true,
        },
        orderBy: {
          date: "asc",
        },
      }),

      prisma.user.groupBy({
        by: ["plan"],
        _count: {
          id: true,
        },
      }),

      prisma.speechGeneration.groupBy({
        by: ["language"],
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: "desc",
          },
        },
      }),
    ]);

    const todayUsage =
      await prisma.usageRecord.aggregate({
        _sum: {
          charactersUsed: true,
          speechCount: true,
          audioSeconds: true,
        },
        where: {
          date: {
            gte: startOfToday,
          },
        },
      });

    const monthUsage =
      await prisma.usageRecord.aggregate({
        _sum: {
          charactersUsed: true,
          speechCount: true,
          audioSeconds: true,
        },
        where: {
          date: {
            gte: startOfMonth,
          },
        },
      });

    res.status(200).json({
      success: true,

      data: {
        overview: {
          totalUsers,
          activeUsers,
          totalSpeeches,
          totalFavorites,
          totalCharacters:
            totalCharacters._sum.charactersUsed || 0,
          totalAudioSeconds:
            totalAudioSeconds._sum.audioSeconds || 0,
        },

        today: {
          charactersUsed:
            todayUsage._sum.charactersUsed || 0,
          speechCount:
            todayUsage._sum.speechCount || 0,
          audioSeconds:
            todayUsage._sum.audioSeconds || 0,
        },

        month: {
          charactersUsed:
            monthUsage._sum.charactersUsed || 0,
          speechCount:
            monthUsage._sum.speechCount || 0,
          audioSeconds:
            monthUsage._sum.audioSeconds || 0,
        },

        weeklyUsage,

        planDistribution: planDistribution.map(
          (item) => ({
            plan: item.plan,
            users: item._count.id,
          })
        ),

        languageDistribution:
          languageDistribution.map((item) => ({
            language: item.language,
            speeches: item._count.id,
          })),
      },
    });
  } catch (error) {
    console.error(
      "Get admin analytics error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Unable to load analytics",
    });
  }
};