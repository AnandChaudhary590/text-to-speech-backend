import { Router } from "express";

import {
  getAdminUsers,
  updateUserStatus,
  updateUserRole,
  updateUserPlan,
} from "../controllers/adminUsersController";

import { authMiddleware } from "../middleware/authMiddleware";
import { adminMiddleware } from "../middleware/adminMiddleware";

const router = Router();

router.get(
  "/",
  authMiddleware,
  adminMiddleware,
  getAdminUsers
);

router.patch(
  "/:id/status",
  authMiddleware,
  adminMiddleware,
  updateUserStatus
);

router.patch(
  "/:id/role",
  authMiddleware,
  adminMiddleware,
  updateUserRole
);

router.patch(
  "/:id/plan",
  authMiddleware,
  adminMiddleware,
  updateUserPlan
);

export default router;