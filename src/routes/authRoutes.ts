import { Router } from "express";
import { register, login, getMe,   refreshAccessToken, logout,   forgotPassword,   resetPassword } from "../controllers/authController";
import { authMiddleware } from "../middleware/authMiddleware";
const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", authMiddleware, getMe);
router.post("/refresh", refreshAccessToken);
router.post("/logout", logout);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;