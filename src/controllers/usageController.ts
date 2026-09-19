import { Response } from "express";
import prisma from "../services/prismaService";
import { AuthRequest } from "../middleware/authMiddleware";

export const getTodayUsage = async (
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

    const today = new Date();

    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

    const startOfTomorrow = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 1
    );

    const usage = await prisma.usageRecord.findFirst({
      where: {
        userId,
        date: {
          gte: startOfDay,
          lt: startOfTomorrow,
        },
      },
    });

    res.status(200).json({
      success: true,
      data: usage ?? {
        charactersUsed: 0,
        speechCount: 0,
        audioSeconds: 0,
      },
    });
  } catch (error) {
    console.error("Get today usage error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to fetch today's usage",
    });
  }
};