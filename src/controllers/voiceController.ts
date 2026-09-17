import { Request, Response } from "express";
import prisma from "../services/prismaService";

export const getVoices = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { language, provider } = req.query;

    const voices = await prisma.voice.findMany({
      where: {
        isActive: true,
        ...(language
          ? { languageCode: String(language) }
          : {}),
        ...(provider
          ? { provider: String(provider) }
          : {}),
      },
      orderBy: [
        { languageCode: "asc" },
        { name: "asc" },
      ],
    });

    res.status(200).json({
      success: true,
      count: voices.length,
      data: voices,
    });
  } catch (error) {
    console.error("Get voices error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to fetch voices",
    });
  }
};