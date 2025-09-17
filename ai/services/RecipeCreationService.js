import geminiService from "./geminiService.js";
import AiEventLogger from "./AiEventLogger.js";
import { getRecipeImage } from "./spoonacularHelper.js";
import { getCanonicalNames } from "../../server/src/utils/ingredientCache.js";


class RecipeCreationService {
  constructor() {
    this.aiLogger = new AiEventLogger();
  }

  validateRecipe(recipe) {
    const allowedUnits = ["ליטר", "מ\"ל", "ק\"ג", "גרם", "יחידה","כוס","כף","כפית"];
    for (const ingredient of recipe.ingredients) {
      if (!allowedUnits.includes(ingredient.unit)) {
        throw new Error(`Invalid unit "${ingredient.unit}" found in recipe.`);
      }
    }
  }

  cleanJsonString(jsonString) {
    let cleaned = jsonString
      .replace(/"מ"ל"/g, '"מ\\"ל"')
      .replace(/"ק"ג"/g, '"ק\\"ג"')
      .replace(/"([א-ת])"([א-ת])"/g, '"$1$2"')
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'")
      .replace(/[\u200B-\u200D\uFEFF\u2060\u00AD\u2028\u2029]/g, '')
      .replace(/\u00A0/g, ' ')
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '')
      .trim();

    cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');

    let inString = false;
    let escaped = false;
    let result = '';
    for (let i = 0; i < cleaned.length; i++) {
      const char = cleaned[i];
      const prev = i > 0 ? cleaned[i-1] : '';
      const next = i < cleaned.length - 1 ? cleaned[i+1] : '';
      
      if (char === '"' && !escaped) inString = !inString;
      if (!inString) {
        if (char === ':' && next !== '/' && prev !== ':') {
          result += ': ';
          while (i + 1 < cleaned.length && /\s/.test(cleaned[i + 1])) i++;
          continue;
        } else if (char === ',' && !/\s/.test(next)) {
          result += ', ';
          continue;
        }
      }
      result += char;
      escaped = (char === '\\' && !escaped);
    }

    return result;
  }

  async generateWithRetries(prompt, retries = 3, delayMs = 10000) {
    for (let i = 0; i < retries; i++) {
      try {
        return await geminiService.generate(prompt);
      } catch (err) {
        if ((err.status === 503 || err.status === 429) && i < retries - 1) {
          console.log(`Service overloaded, retrying in ${delayMs / 1000}s...`);
          await new Promise(r => setTimeout(r, delayMs));
        } else {
          throw err;
        }
      }
    }
  }
  
  async createFromText(recipeText = "") {
    const allowedIngredients = getCanonicalNames();
    const prompt = `
You are a creative recipe generator. Generate ONE complete recipe strictly in JSON format using this structure:

{
  "title": "string",
  "photoUrl": "string",
  "tags": ["string"],
  "steps": ["string"],
  "ingredients": [
    {
      "name": "string",
      "qty": number,
      "unit": "ליטר|מ\"ל|ק\"ג|גרם|יחידה"
    }
  ]
}

VALIDATION:
- You may ONLY use ingredients from the following list: ${JSON.stringify(allowedIngredients)}.
- DO NOT invent or use any ingredient outside of this list.
- You MUST use one of the following units for ingredients: ליטר, מ"ל, ק"ג, גרם, יחידה.
- Any other unit (e.g., כף, כפית, קורט) is FORBIDDEN.
- All text must be entirely in Hebrew.
- Include 1–3 relevant tags from the predefined list.
- Provide 3–6 realistic preparation steps.
- Include at least one dietary tag.
- Provide a realistic photo URL (can be placeholder; will auto-update via Spoonacular).
${recipeText ? `Use this inspiration: "${recipeText}"` : ""}
`;

    const start = Date.now();
    let lastError = null;

    for (let i = 0; i < 3; i++) {
      try {
        const output = await this.generateWithRetries(prompt);
        const cleanedOutput = this.cleanJsonString(output);

        let parsed;
        try {
          parsed = JSON.parse(cleanedOutput);
        } catch {
          const firstBrace = cleanedOutput.indexOf("{");
          const lastBrace = cleanedOutput.lastIndexOf("}");
          const jsonString = cleanedOutput.slice(firstBrace, lastBrace + 1);
          parsed = JSON.parse(this.cleanJsonString(jsonString));
        }

        this.validateRecipe(parsed);

        // ✅ Automatically fetch photoUrl from Spoonacular
        if (!parsed.photoUrl || parsed.photoUrl.includes("PLACEHOLDER_IMAGE")) {
          const imageUrl = await getRecipeImage(parsed.title);
          if (imageUrl) parsed.photoUrl = imageUrl;
        }

        await this.aiLogger.logEvent({
          kind: "extractIngredients",
          input: prompt,
          output: parsed,
          model: "gemini-1.5-flash",
          latencyMs: Date.now() - start,
        });

        return parsed;
      } catch (err) {
        console.error(`Attempt ${i + 1} failed:`, err.message);
        lastError = err;
        if (i < 2) await new Promise(r => setTimeout(r, 2000));
      }
    }

    await this.aiLogger.logEvent({
      kind: "extractIngredients",
      input: prompt,
      output: { error: lastError.message },
      model: "gemini-1.5-flash",
      latencyMs: Date.now() - start,
    });
    throw lastError;
  }
}

export default new RecipeCreationService();