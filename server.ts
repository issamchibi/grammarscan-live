import express from "express";
import { createServer as createViteServer } from "vite";
import { secureAnalyzeHandler } from "./api/handler";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: Proxy to Cloudflare Worker
  app.post("/api/analyze", async (req, res) => {
    try {
      const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "anonymous";
      const payload = req.body;
      
      const result = await secureAnalyzeHandler(Array.isArray(ip) ? ip[0] : ip, payload);
      res.json(result);
    } catch (error: any) {
      console.error(`[SERVER_ERROR]: ${error.message}`);
      res.status(500).json({ error: error.message || "Internal Server Error" });
    }
  });

  app.post("/api/signup", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: "Email is required" });

      // Forward to Cloudflare Worker
      const response = await fetch("https://rough-wildflower-615f.issamchibi123.workers.dev/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) throw new Error("Worker signup failed");
      
      res.json({ success: true });
    } catch (error: any) {
      console.error(`[SIGNUP_ERROR]: ${error.message}`);
      res.status(500).json({ error: error.message || "Internal Server Error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
