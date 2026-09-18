import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // API Routes
  app.post("/api/gemini/proofread", async (req, res) => {
    try {
      const { content } = req.body;
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `You are an expert copyeditor. Proofread the following text for:
        1. Spelling and typos
        2. Grammatical errors
        3. Punctuation issues
        4. Awkward phrasing
        
        Respond in JSON format.
        Text to proofread:
        ${content}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              suggestions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING },
                    original: { type: Type.STRING },
                    suggested: { type: Type.STRING },
                    explanation: { type: Type.STRING }
                  },
                  required: ["type", "original", "suggested", "explanation"]
                }
              }
            },
            required: ["suggestions"]
          }
        }
      });
      res.json(JSON.parse(response.text || '{"suggestions":[]}'));
    } catch (error) {
      console.error("AI Proofreading failed:", error);
      res.status(500).json({ error: "Proofreading failed" });
    }
  });

  app.post("/api/gemini/analyze", async (req, res) => {
    try {
      const { storyline, content } = req.body;
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analyze the consistency of this chapter against the overall storyline.
        Storyline: ${storyline}
        Chapter Content: ${content}
        Identify any plot holes or inconsistencies. Respond in JSON format.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isConsistent: { type: Type.BOOLEAN },
              feedback: { type: Type.STRING },
              inconsistencies: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["isConsistent", "feedback"]
          }
        }
      });
      res.json(JSON.parse(response.text || '{"isConsistent":true, "feedback":""}'));
    } catch (error) {
      console.error("AI Analysis failed:", error);
      res.status(500).json({ error: "Analysis failed" });
    }
  });

  app.post("/api/gemini/translate", async (req, res) => {
    try {
      const { content, targetLanguage } = req.body;
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Translate the following manuscript manuscript text into ${targetLanguage}. 
        Maintain the original editorial tone, artistic style, and formatting.
        Ensure it reads naturally for a native speaker of ${targetLanguage}.
        
        Text to translate:
        ${content}`,
        config: {
          systemInstruction: "You are a professional literary translator. Your goal is to preserve the 'voice' of the author while ensuring perfect grammatical and cultural accuracy in the target language."
        }
      });
      res.json({ translatedText: response.text });
    } catch (error) {
      console.error("AI Translation failed:", error);
      res.status(500).json({ error: "Translation failed" });
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
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
