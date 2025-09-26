import geminiService from "./geminiService.js";
import AiEventLogger from "./AiEventLogger.js";

class IngredientExtractorService {
  constructor() {
    this.aiLogger = new AiEventLogger();
    this.allowedUnits = ["ליטר", "מ\"ל", "ק\"ג", "גרם", "יחידה", "כף", "כפית"];
  }

  validateIngredients(ingredients) {
    for (const ingredient of ingredients) {
      if (!this.allowedUnits.includes(ingredient.unit)) {
        throw new Error(`Invalid unit "${ingredient.unit}" for ingredient "${ingredient.name}".`);
      }
    }
  }

  cleanJsonString(jsonString) {
    let cleaned = jsonString
      .replace(/```json|```/g, "")
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .trim();

    cleaned = cleaned.replace(/,(\s*[}\]])/g, "$1");
    return cleaned;
  }

  async extract(recipeText) {
    const prompt = `
You are an ingredient extractor. Given a recipe description (title, photoURL, tags, steps, ingredients), return ONLY the ingredients in strict JSON format:

[
  { "name": "string", "qty": number, "unit": "ליטר|מ\"ל|ק\"ג|גרם|כף|כפית|יחידה" }
]

Validation:
- Use ONLY these units: ליטר, מ"ל, ק"ג, גרם, יחידה, כף, כפית.
- Do NOT return any other fields besides the array.
- All text must be in Hebrew.
- If qty is not clear, estimate a reasonable numeric value.
- Always output valid JSON.
    
Recipe to analyze:
"${recipeText}"
`;

    const start = Date.now();
    let output, cleaned, parsed;

    try {
      output = await geminiService.generate(prompt);
      cleaned = this.cleanJsonString(output);
      parsed = JSON.parse(cleaned);

      this.validateIngredients(parsed);

      await this.aiLogger.logEvent({
        kind: "extractIngredients",
        input: recipeText,
        output: parsed,
        model: "gemini-1.5-flash",
        latencyMs: Date.now() - start,
      });

      return parsed;
    } catch (err) {
      await this.aiLogger.logEvent({
        kind: "extractIngredients",
        input: recipeText,
        output: { error: err.message, raw: output },
        model: "gemini-1.5-flash",
        latencyMs: Date.now() - start,
      });
      throw err;
    }
  }
}

export default new IngredientExtractorService();
