import { Router } from "express";

import {
  uploadFile,
  getUploadedFiles,
  getFileById,
  deleteFile,
} from "../controllers/fileController";
import { authMiddleware } from "../middleware/authMiddleware";
import upload from "../middleware/uploadMiddleware";

const router = Router();

router.post(
  "/upload",
  authMiddleware,
  upload.single("file"),
  uploadFile
);


router.get(
  "/",
  authMiddleware,
  getUploadedFiles
);

router.get(
  "/:fileId",
  authMiddleware,
  getFileById
);

router.delete(
  "/:fileId",
  authMiddleware,
  deleteFile
);

export default router;