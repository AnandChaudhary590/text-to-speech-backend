import { Response } from "express";
import prisma from "../services/prismaService";
import { AuthRequest } from "../middleware/authMiddleware";

// ===============================
// ADD SPEECH TO FAVORITES
// ===============================

export const addFavorite = async (
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
    const speechId = String(req.params.speechId);
    if (!speechId) {
      res.status(400).json({
        success: false,
        message: "Speech ID is required",
      });
      return;
    }

    const speech = await prisma.speechGeneration.findFirst({
      where: {
        id: speechId,
        userId,
      },
    });

    if (!speech) {
      res.status(404).json({
        success: false,
        message: "Speech not found",
      });
      return;
    }

    const existingFavorite = await prisma.favorite.findUnique({
      where: {
        speechId,
      },
    });

    if (existingFavorite) {
      res.status(409).json({
        success: false,
        message: "Speech is already in favorites",
      });
      return;
    }

    const favorite = await prisma.favorite.create({
      data: {
        userId,
        speechId,
      },
      include: {
        speech: {
          include: {
            voice: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: "Speech added to favorites",
      data: favorite,
    });
  } catch (error) {
    console.error("Add favorite error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to add speech to favorites",
    });
  }
};

// ===============================
// REMOVE SPEECH FROM FAVORITES
// ===============================

export const removeFavorite = async (
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
    const speechId = String(req.params.speechId);
    if (!speechId) {
      res.status(400).json({
        success: false,
        message: "Speech ID is required",
      });
      return;
    }

    const favorite = await prisma.favorite.findFirst({
      where: {
        speechId,
        userId,
      },
    });

    if (!favorite) {
      res.status(404).json({
        success: false,
        message: "Favorite not found",
      });
      return;
    }

    await prisma.favorite.delete({
      where: {
        id: favorite.id,
      },
    });

    res.status(200).json({
      success: true,
      message: "Speech removed from favorites",
    });
  } catch (error) {
    console.error("Remove favorite error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to remove speech from favorites",
    });
  }
};

// ===============================
// GET USER FAVORITES
// ===============================

export const getFavorites = async (
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

    const favorites = await prisma.favorite.findMany({
      where: {
        userId,
      },
      include: {
        speech: {
          include: {
            voice: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.status(200).json({
      success: true,
      count: favorites.length,
      data: favorites,
    });
  } catch (error) {
    console.error("Get favorites error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to fetch favorites",
    });
  }
};