import "dotenv/config";
import express from "express";
import cors from "cors";
import { prisma } from "./lib/prisma";
import authRoutes from "./routes/auth.routes";
import { authenticate, AuthRequest } from "./middleware/auth";
import permitRoutes from "./routes/permit.routes";
import { startPermitExpiryJob } from "./jobs/permit-expiry.job";

const app = express();

const PORT = Number(process.env.PORT) || 5000;

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

app.use("/api/auth", authRoutes);
app.get("/api/auth/me", authenticate, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: req.user!.userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.json({ user });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
});

app.use("/api/permits", permitRoutes);

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 PTW backend running on http://localhost:${PORT}`);
});

startPermitExpiryJob();