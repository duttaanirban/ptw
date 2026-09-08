import "dotenv/config";
import express from "express";
import cors from "cors";
import { prisma } from "./lib/prisma";

const app = express();

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get("/health", async (_req, res) => {
  try {
    await prisma.user.count();

    res.json({
      status: "ok",
      database: "connected",
      message: "PTW backend is running",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      status: "error",
      database: "disconnected",
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 PTW backend running on http://localhost:${PORT}`);
});