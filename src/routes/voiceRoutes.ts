import { Router } from "express";
import { getVoices } from "../controllers/voiceController";

const router = Router();

router.get("/", getVoices);

export default router;