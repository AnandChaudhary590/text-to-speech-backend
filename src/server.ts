import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import prisma from "./services/prismaService";
import authRoutes from "./routes/authRoutes";
import cookieParser from "cookie-parser";
import voiceRoutes from "./routes/voiceRoutes";
import speechRoutes from "./routes/speechRoutes";
import favoriteRoutes from "./routes/favoriteRoutes";
import fileRoutes from "./routes/fileRoutes";

import path from "path";

dotenv.config();

const app = express();

app.use(
  "/uploads",
  express.static(path.join(process.cwd(), "uploads"))
);

const PORT = process.env.PORT || 5000;

// Security
app.use(helmet());


// CORS
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

// JSON body parser
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
// Request logging
app.use(morgan("dev"));


// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

app.use("/api", apiLimiter);
app.use("/api/auth", authRoutes);
app.use("/api/voices", voiceRoutes);
app.use("/api/speech", speechRoutes);
app.use("/api/favorites",favoriteRoutes);
app.use("/api/files", fileRoutes);

// Health check
app.get("/api/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      success: true,
      message: "Text-to-Speech API is running",
      database: "connected",
    });
  } catch (error) {
    console.error("Database connection error:", error);

    res.status(500).json({
      success: false,
      message: "Database connection failed",
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`TTS Backend running on port ${PORT}`);
});