import { Router } from "express";
import { getTodayUsage } from "../controllers/usageController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

router.get(
  "/today",
  authMiddleware,
  getTodayUsage
);

export default router;