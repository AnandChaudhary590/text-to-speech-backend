import { Router } from "express";

import {
  addFavorite,
  removeFavorite,
  getFavorites,
} from "../controllers/favoriteController";

import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

// Add speech to favorites
router.post("/:speechId", authMiddleware, addFavorite);

// Remove speech from favorites
router.delete("/:speechId", authMiddleware, removeFavorite);

// Get all favorites
router.get("/", authMiddleware, getFavorites);

export default router;