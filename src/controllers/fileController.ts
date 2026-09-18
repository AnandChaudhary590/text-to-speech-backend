import { Response } from "express";
import path from "path";
import fs from "fs/promises";

import prisma from "../services/prismaService";
import { AuthRequest } from "../middleware/authMiddleware";
import { extractTextFromFile } from "../services/fileExtractionService";

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