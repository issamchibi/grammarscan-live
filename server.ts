import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { secureAnalyzeHandler } from "./api/handler.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // =========================
  // API ROUTES
  // =========================

  app.post("/api/analyze", async (req, res) => {
    try {
      const ip =
        req.headers["x-forwarded-for"] ||
        req.socket.remoteAddress ||
        "anonymous";

      const payload = req.body;

      const result = await secureAnalyzeHandler(
        Array.isArray(ip) ? ip[0] : ip,
        payload
      );

      res.json(result);
    } catch (error: any) {
      console.error("Analyze error:", error);

      res.status(500).json({
        error: error.message || "Internal Server Error",
      });
    }
  });

  app.post("/api/signup", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: "Email required" });
      }

      const response = await fetch(
        "https://rough-wildflower-615f.issamchibi123.workers.dev/signup",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        }
      );

      if (!response.ok) {
        throw new Error("Worker signup failed");
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Signup error:", error);

      res.status(500).json({
        error: error.message || "Signup failed",
      });
    }
  });

  // =========================
  // SERVE FRONTEND
  // =========================

  const distPath = path.join(__dirname, "dist");

  app.use(express.static(distPath));

  app.get("/*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });

  // =========================
  // START SERVER
  // =========================

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
