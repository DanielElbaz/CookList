import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

class GeminiService {
  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set in environment variables.");
    }
    this.client = new GoogleGenerativeAI(apiKey);
    this.model = this.client.getGenerativeModel({ model: "gemini-1.5-flash" });
  }

  async generate(prompt) {
    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();
    } catch (err) {
      console.error("Gemini API error:", err);
      throw err;
    }
  }

  async generateJSON(prompt) {
    const text = await this.generate(prompt);

    try {
      return JSON.parse(text);
    } catch (_) {
      // Try to extract first JSON block {...} or array [...]
      const objMatch = text.match(/(\{[\s\S]*\})/);
      if (objMatch) {
        try { return JSON.parse(objMatch[1]); } catch (_) {}
      }
      const arrMatch = text.match(/(\[[\s\S]*\])/);
      if (arrMatch) {
        try { return JSON.parse(arrMatch[1]); } catch (_) {}
      }
    }

    // If we get here, parsing failed — return the raw text so caller can inspect
    throw new Error("Failed to parse JSON from Gemini response. Raw response saved in error.message");
  }
}

export default new GeminiService();