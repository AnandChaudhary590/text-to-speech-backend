import { Response } from "express";
import prisma from "../services/prismaService";
import { AuthRequest } from "../middleware/authMiddleware";
import { generateSpeech } from "../services/ttsService";
import { updateDailyUsage } from "../services/usageService";
import { checkUsageLimit } from "../services/usageLimitService";

export const generateSpeechController = async (
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

    const {
      text,
      language,
      voiceId,
      speed = 1.0,
      pitch = 0.0,
      volume = 1.0,
    } = req.body;

    // Validate text
    if (!text || typeof text !== "string") {
      res.status(400).json({
        success: false,
        message: "Text is required",
      });
      return;
    }

    const trimmedText = text.trim();
    const usageLimit = await checkUsageLimit(
  req.user.userId,
  trimmedText.length
);

if (!usageLimit.allowed) {
  res.status(429).json({
    success: false,
    message: "Daily character usage limit exceeded",
    data: {
      plan: usageLimit.plan,
      limit: usageLimit.limit,
      used: usageLimit.used,
      remaining: usageLimit.remaining,
      requested: trimmedText.length,
    },
  });
  return;
}

    if (!trimmedText) {
      res.status(400).json({
        success: false,
        message: "Text cannot be empty",
      });
      return;
    }

    if (trimmedText.length > 5000) {
      res.status(400).json({
        success: false,
        message: "Text cannot exceed 5000 characters",
      });
      return;
    }

    // Validate language
    if (!language || typeof language !== "string") {
      res.status(400).json({
        success: false,
        message: "Language is required",
      });
      return;
    }

    // Validate voice
    let voice = null;

    if (voiceId) {
      voice = await prisma.voice.findFirst({
        where: {
          id: voiceId,
          isActive: true,
        },
      });

      if (!voice) {
        res.status(404).json({
          success: false,
          message: "Voice not found or inactive",
        });
        return;
      }
    }

    // Validate voice language
    if (voice && voice.languageCode !== language) {
      res.status(400).json({
        success: false,
        message: "Voice does not support the selected language",
      });
      return;
    }

    // Validate speech settings
    if (
      typeof speed !== "number" ||
      speed < 0.5 ||
      speed > 2.0
    ) {
      res.status(400).json({
        success: false,
        message: "Speed must be between 0.5 and 2.0",
      });
      return;
    }

    if (
      typeof pitch !== "number" ||
      pitch < -20 ||
      pitch > 20
    ) {
      res.status(400).json({
        success: false,
        message: "Pitch must be between -20 and 20",
      });
      return;
    }

    if (
      typeof volume !== "number" ||
      volume < 0 ||
      volume > 2
    ) {
      res.status(400).json({
        success: false,
        message: "Volume must be between 0 and 2",
      });
      return;
    }

    // Create speech generation record
    const speech = await prisma.speechGeneration.create({
      data: {
        userId: req.user.userId,
       voiceId: voice?.id,
        text: trimmedText,
        language,
        speed,
        pitch,
        volume,
        status: "PROCESSING",
      },
    });

    try {
      const result = await generateSpeech({
  text: trimmedText,
  language,
  providerVoiceId: voice?.providerId,
  speed,
  pitch,
  volume,
});
await updateDailyUsage(req.user.userId, {
  charactersUsed: trimmedText.length,
  speechCount: 1,
  audioSeconds: result.duration ?? 0,
});
      const updatedSpeech = await prisma.speechGeneration.update({
        where: {
          id: speech.id,
        },
        data: {
          audioUrl: result.audioUrl,
          duration: result.duration,
          status: "COMPLETED",
        },
      });

      res.status(200).json({
        success: true,
        message: "Speech generated successfully",
        data: updatedSpeech,
      });
    } catch (ttsError) {
      console.error("TTS provider error:", ttsError);

      await prisma.speechGeneration.update({
        where: {
          id: speech.id,
        },
        data: {
          status: "FAILED",
          errorMessage: "TTS generation failed",
        },
      });

      res.status(502).json({
        success: false,
        message: "Speech generation service is currently unavailable",
      });
    }
  } catch (error) {
    console.error("Generate speech error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to generate speech",
    });
  }
};

export const getSpeechHistory = async (
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

    const speeches = await prisma.speechGeneration.findMany({
      where: {
        userId: req.user.userId,
      },
      include: {
        voice: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.status(200).json({
      success: true,
      count: speeches.length,
      data: speeches,
    });
  } catch (error) {
    console.error("Get speech history error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to fetch speech history",
    });
  }
};

// ===============================
// DELETE SPEECH
// ===============================

export const deleteSpeech = async (
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
  const speechId = String(req.params.id);

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

    await prisma.speechGeneration.delete({
      where: {
        id: speechId,
      },
    });

    res.status(200).json({
      success: true,
      message: "Speech deleted successfully",
    });
  } catch (error) {
    console.error("Delete speech error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to delete speech",
    });
  }
};