import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for non-streaming generation
  app.post("/api/generate", async (req, res) => {
    try {
      const { model, contents, systemInstruction, temperature, topP, topK, maxOutputTokens, googleSearch } = req.body;
      
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "La clé d'API GEMINI_API_KEY est manquante." });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const config: any = {};
      if (systemInstruction) config.systemInstruction = systemInstruction;
      if (typeof temperature === 'number') config.temperature = temperature;
      if (typeof topP === 'number') config.topP = topP;
      if (typeof topK === 'number') config.topK = topK;
      if (typeof maxOutputTokens === 'number' && maxOutputTokens > 0) config.maxOutputTokens = maxOutputTokens;
      if (googleSearch) config.tools = [{ googleSearch: {} }];

      const modelName = model || "gemini-3.5-flash";

      const response = await ai.models.generateContent({
        model: modelName,
        contents: contents,
        config: config
      });

      const gMetadata = response.candidates?.[0]?.groundingMetadata;
      res.json({
        text: response.text,
        groundingChunks: gMetadata?.groundingChunks || null
      });
    } catch (err: any) {
      console.error("Erreur génération API:", err);
      res.status(500).json({ error: err.message || "Erreur de génération." });
    }
  });

  // API Route for streaming generation
  app.post("/api/generate-stream", async (req, res) => {
    try {
      const { model, contents, systemInstruction, temperature, topP, topK, maxOutputTokens, googleSearch } = req.body;
      
      if (!process.env.GEMINI_API_KEY) {
        res.writeHead(500, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "La clé d'API GEMINI_API_KEY est manquante sur le serveur." }));
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const config: any = {};
      if (systemInstruction) config.systemInstruction = systemInstruction;
      if (typeof temperature === 'number') config.temperature = temperature;
      if (typeof topP === 'number') config.topP = topP;
      if (typeof topK === 'number') config.topK = topK;
      if (typeof maxOutputTokens === 'number' && maxOutputTokens > 0) config.maxOutputTokens = maxOutputTokens;
      if (googleSearch) config.tools = [{ googleSearch: {} }];

      const modelName = model || "gemini-3.5-flash";

      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
      });

      const responseStream = await ai.models.generateContentStream({
        model: modelName,
        contents: contents,
        config: config
      });

      for await (const chunk of responseStream) {
        const gMetadata = chunk.candidates?.[0]?.groundingMetadata;
        const payload = {
          text: chunk.text || "",
          groundingChunks: gMetadata?.groundingChunks || null
        };
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
      }
      res.write("data: [DONE]\n\n");
      res.end();
    } catch (err: any) {
      console.error("Erreur serveur generation-stream:", err);
      try {
        res.write(`data: ${JSON.stringify({ error: err.message || "Une erreur interne est survenue sur le serveur de l'application." })}\n\n`);
      } catch (writeErr) {
        // headers sent
      }
      res.end();
    }
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Le serveur du Studio d'IA Google fonctionne parfaitement." });
  });

  // Vite Integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Serveur d'application démarré sur http://localhost:${PORT}`);
  });
}

startServer();
