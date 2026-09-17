import { Router } from "express";
import {
  generateSpeechController,
  getSpeechHistory,
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

export default router;