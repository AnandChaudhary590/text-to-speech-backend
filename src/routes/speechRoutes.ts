import { Router } from "express";
import {
  generateSpeechController,
  getSpeechHistory,
  deleteSpeech,
} from "../controllers/speechController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

router.get(
  "/history",
  authMiddleware,
  getSpeechHistory
);

router.post(
  "/generate",
  authMiddleware,
  generateSpeechController
);

router.delete(
  "/:id",
  authMiddleware,
  deleteSpeech
);

export default router;