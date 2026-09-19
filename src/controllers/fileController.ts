import { Response } from "express";
import path from "path";
import fs from "fs/promises";

import prisma from "../services/prismaService";
import { AuthRequest } from "../middleware/authMiddleware";
import { extractTextFromFile } from "../services/fileExtractionService";
import { updateDailyUsage } from "../services/usageService";
import { checkUsageLimit } from "../services/usageLimitService";

export const uploadFile = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    // Check authentication
    if (!req.user?.userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    // Check uploaded file
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: "File is required",
      });
      return;
    }

    const userId = req.user.userId;
    const file = req.file;

    // Extract text
    const extractedText = await extractTextFromFile(
      file.path,
      file.mimetype
    );

    // Determine file type
    const extension = path
      .extname(file.originalname)
      .toLowerCase();

    let fileType: "TXT" | "PDF" | "DOCX";

    if (extension === ".txt") {
      fileType = "TXT";
    } else if (extension === ".pdf") {
      fileType = "PDF";
    } else if (extension === ".docx") {
      fileType = "DOCX";
    } else {
      await fs.unlink(file.path);

      res.status(400).json({
        success: false,
        message: "Unsupported file type",
      });
      return;
    }

    // Save file information in database
    const uploadedFile = await prisma.uploadedFile.create({
      data: {
        userId,
        originalName: file.originalname,
        storageKey: path.relative(process.cwd(), file.path),
        fileUrl: `/uploads/documents/${file.filename}`,
        fileType,
        mimeType: file.mimetype,
        fileSize: file.size,
        extractedText,
      },
    });

    res.status(201).json({
      success: true,
      message: "File uploaded and text extracted successfully",
      data: uploadedFile,
    });
  } catch (error) {
    console.error("Upload file error:", error);

    // Delete uploaded file if something fails
    if (req.file?.path) {
      try {
        await fs.unlink(req.file.path);
      } catch {
        // Ignore file deletion error
      }
    }

    res.status(500).json({
      success: false,
      message: "Unable to upload and process file",
    });
  }
};

export const getUploadedFiles = async (
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

    const files = await prisma.uploadedFile.findMany({
      where: {
        userId: req.user.userId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.status(200).json({
      success: true,
      count: files.length,
      data: files,
    });
  } catch (error) {
    console.error("Get uploaded files error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to fetch uploaded files",
    });
  }
};

export const getFileById = async (
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
    const fileId = String(req.params.fileId);

    if (!fileId) {
      res.status(400).json({
        success: false,
        message: "File ID is required",
      });
      return;
    }

    const file = await prisma.uploadedFile.findFirst({
      where: {
        id: fileId,
        userId,
      },
    });

    if (!file) {
      res.status(404).json({
        success: false,
        message: "File not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: file,
    });
  } catch (error) {
    console.error("Get file by ID error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to fetch file",
    });
  }
};

export const deleteFile = async (
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
    const fileId = String(req.params.fileId);

    if (!fileId) {
      res.status(400).json({
        success: false,
        message: "File ID is required",
      });
      return;
    }

    const file = await prisma.uploadedFile.findFirst({
      where: {
        id: fileId,
        userId,
      },
    });

    if (!file) {
      res.status(404).json({
        success: false,
        message: "File not found",
      });
      return;
    }

    const filePath = path.join(process.cwd(), file.storageKey);

    try {
      await fs.unlink(filePath);
    } catch {
      // Ignore if physical file is already missing
    }

    await prisma.uploadedFile.delete({
      where: {
        id: file.id,
      },
    });

    res.status(200).json({
      success: true,
      message: "File deleted successfully",
    });
  } catch (error) {
    console.error("Delete file error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to delete file",
    });
  }
};

export const generateSpeechFromFile = async (
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
    const fileId = String(req.params.fileId);

    if (!fileId) {
      res.status(400).json({
        success: false,
        message: "File ID is required",
      });
      return;
    }

    const file = await prisma.uploadedFile.findFirst({
      where: {
        id: fileId,
        userId,
      },
    });

    if (!file) {
      res.status(404).json({
        success: false,
        message: "File not found",
      });
      return;
    }

    if (!file.extractedText?.trim()) {
      res.status(400).json({
        success: false,
        message: "No text available in this file",
      });
      return;
    }
    const extractedText = file.extractedText.trim();

const usageLimit = await checkUsageLimit(
  userId,
  extractedText.length
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
      requested: extractedText.length,
    },
  });
  return;
}

    const language = String(req.body.language || "en-US");
    const voiceId = req.body.voiceId
      ? String(req.body.voiceId)
      : undefined;

    const speed = req.body.speed !== undefined
      ? Number(req.body.speed)
      : 1.0;

    const pitch = req.body.pitch !== undefined
      ? Number(req.body.pitch)
      : 0.0;

    const volume = req.body.volume !== undefined
      ? Number(req.body.volume)
      : 1.0;

    const voice = voiceId
      ? await prisma.voice.findFirst({
          where: {
            id: voiceId,
            isActive: true,
          },
        })
      : null;

    if (voiceId && !voice) {
      res.status(404).json({
        success: false,
        message: "Voice not found",
      });
      return;
    }

    if (voice && voice.languageCode !== language) {
      res.status(400).json({
        success: false,
        message: "Selected voice does not match the selected language",
      });
      return;
    }

    const speech = await prisma.speechGeneration.create({
      data: {
        userId,
        voiceId: voice?.id,
        text: extractedText,
        language,
        speed,
        pitch,
        volume,
        status: "PROCESSING",
      },
    });

    try {
      const { generateSpeech } = await import(
        "../services/ttsService.js"
      );

      const result = await generateSpeech({
        text: extractedText,
        language,
        providerVoiceId: voice?.providerId,
        speed,
        pitch,
        volume,
      });

      await updateDailyUsage(userId, {
  charactersUsed: extractedText.length,
  speechCount: 1,
  audioSeconds: result.duration ?? 0,
});

      const updatedSpeech = await prisma.speechGeneration.update({
        where: {
          id: speech.id,
        },
        data: {
          status: "COMPLETED",
          audioUrl: result.audioUrl,
          duration: result.duration,
        },
        include: {
          voice: true,
        },
      });

      res.status(201).json({
        success: true,
        message: "Speech generated successfully from file",
        data: updatedSpeech,
      });
    } catch (error) {
      console.error("File TTS generation error:", error);

      await prisma.speechGeneration.update({
        where: {
          id: speech.id,
        },
        data: {
          status: "FAILED",
          errorMessage: "Speech generation failed",
        },
      });

      res.status(502).json({
        success: false,
        message: "Unable to generate speech from file",
      });
    }
  } catch (error) {
    console.error("Generate speech from file error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to generate speech from file",
    });
  }
};