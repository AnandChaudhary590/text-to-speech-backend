import { Router } from "express";
import { getAdminAnalytics } from "../controllers/adminAnalyticsController";
import { authMiddleware } from "../middleware/authMiddleware";
import { adminMiddleware } from "../middleware/adminMiddleware";

const router = Router();

router.get(
  "/",
  authMiddleware,
  adminMiddleware,
  getAdminAnalytics
);

export default router;