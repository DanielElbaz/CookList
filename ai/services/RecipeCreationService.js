import geminiService from "./geminiService.js";
import AiEventLogger from "./AiEventLogger.js";

class RecipeCreationService {
  constructor() {
    this.aiLogger = new AiEventLogger();
  }

  validateRecipe(recipe) {
    const allowedUnits = ["ליטר", "מ\"ל", "ק\"ג", "גרם", "יחידה"];
    for (const ingredient of recipe.ingredients) {
      if (!allowedUnits.includes(ingredient.unit)) {
        throw new Error(`Invalid unit "${ingredient.unit}" found in recipe.`);
      }
    }
  }

  // Clean JSON string to handle Hebrew quotation marks and other problematic characters
  cleanJsonString(jsonString) {
    console.log("Original string length:", jsonString.length);
    
    let cleaned = jsonString
      // First, fix the specific problem with Hebrew units like מ"ל and ק"ג
      // Replace the problematic Hebrew quoted units with proper versions
      .replace(/"מ"ל"/g, '"מ\\"ל"')  // "מ"ל" -> "מ\"ל"
      .replace(/"ק"ג"/g, '"ק\\"ג"')  // "ק"ג" -> "ק\"ג"
      // Or alternatively, remove the inner quotes completely
      .replace(/"([א-ת])"([א-ת])"/g, '"$1$2"')  // "מ"ל" -> "מל"
      // Replace other Hebrew quotation marks with ASCII quotation marks
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'")
      // Remove ALL problematic Unicode characters
      .replace(/[\u200B-\u200D\uFEFF\u2060\u00AD\u2028\u2029]/g, '')
      // Replace non-breaking spaces with regular spaces
      .replace(/\u00A0/g, ' ')
      // Remove any other invisible or control characters except basic whitespace
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '')
      .trim();

    console.log("After Unicode cleaning length:", cleaned.length);

    // Now clean up the structure more carefully
    // Remove trailing commas before closing brackets/braces
    cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');

    // Fix spacing around structural elements, but be very careful with URLs
    // Only normalize spacing for property separators, not within string values
    let inString = false;
    let escaped = false;
    let result = '';
    
    for (let i = 0; i < cleaned.length; i++) {
      const char = cleaned[i];
      const prev = i > 0 ? cleaned[i-1] : '';
      const next = i < cleaned.length - 1 ? cleaned[i+1] : '';
      
      if (char === '"' && !escaped) {
        inString = !inString;
      }
      
      if (!inString) {
        // Outside of strings, normalize spacing around structural characters
        if (char === ':' && next !== '/' && prev !== ':') {
          result += ': ';
          // Skip any following whitespace
          while (i + 1 < cleaned.length && /\s/.test(cleaned[i + 1])) {
            i++;
          }
          continue;
        } else if (char === ',' && !/\s/.test(next)) {
          result += ', ';
          continue;
        }
      }
      
      result += char;
      escaped = (char === '\\' && !escaped);
    }

    console.log("Final cleaned length:", result.length);
    return result;
  }

  // Retry logic for overloaded API
  async generateWithRetries(prompt, retries = 3, delayMs = 10000) {
    for (let i = 0; i < retries; i++) {
      try {
        const output = await geminiService.generate(prompt);
        return output;
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
    const prompt = `
You are a creative recipe generator. Generate ONE complete recipe strictly in JSON format using this structure:

{
  "title": "string",
  "ingredients": [
    {
      "name": "string",
      "qty": number,
      "unit": "ליטר|מ\"ל|ק\"ג|גרם|יחידה"
    }
  ],
  "steps": ["string"],
  "tags": ["string"],
  "photoUrl": "string"
}

VALIDATION:
- You MUST use one of the following units for ingredients: ליטר, מ"ל, ק"ג, גרם, יחידה.
- Any other unit (e.g., כף, כפית, קורט) is FORBIDDEN.
- I will automatically reject any recipe that contains a forbidden unit.

Requirements:
- All text must be entirely in Hebrew.
- Do NOT mix Hebrew with English.
- Provide 3–6 realistic and unique preparation steps.
- Include 1–3 relevant tags.
- Provide a realistic photo URL from the internet for the recipe.
- Make the recipe creative, diverse, and unique every time.
- Do not add any extra formatting such as Markdown, backticks, or comments.
- Do not include trailing commas.
- Do not add any whitespace outside the JSON.
- Use only standard ASCII quotation marks (") in the JSON, not Hebrew quotation marks.
${recipeText ? `Use this inspiration: "${recipeText}"` : ""}

IMPORTANT:
- Only output valid JSON.
- Adhere strictly to the VALIDATION rules.
- Do NOT wrap the JSON in code blocks or add explanations.
- Ensure the JSON is properly closed and has no syntax errors.
- Arrays and objects should not have trailing commas.
- Use standard ASCII quotation marks (") only.
`

    const start = Date.now();
    let lastError = null;

    for (let i = 0; i < 3; i++) {
      try {
        const output = await this.generateWithRetries(prompt);
        console.log("Raw Gemini output:\n", output); // debug

        const cleanedOutput = this.cleanJsonString(output);
        console.log("Cleaned output:\n", cleanedOutput); // debug

        let parsed;
        try {
          parsed = JSON.parse(cleanedOutput);
        } catch (parseError) {
          console.log("Direct parsing failed, trying to extract JSON block...");
          console.log(`Parse error: ${parseError.message}`);
          
          // Show the problematic area around the error position
          if (parseError.message.includes('at position')) {
            const position = parseInt(parseError.message.match(/position (\d+)/)[1]);
            const start = Math.max(0, position - 20);
            const end = Math.min(cleanedOutput.length, position + 20);
            const snippet = cleanedOutput.slice(start, end);
            console.log(`Problematic area around position ${position}:`);
            console.log(`"${snippet}"`);
            console.log(`Character codes: [${Array.from(snippet).map(c => c.charCodeAt(0)).join(', ')}]`);
          }
          
          // Try to extract JSON from the cleaned output
          const firstBrace = cleanedOutput.indexOf("{");
          const lastBrace = cleanedOutput.lastIndexOf("}");
          
          if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
            throw new Error(`Could not extract JSON from Gemini output. Parse error: ${parseError.message}`);
          }
          
          const jsonString = cleanedOutput.slice(firstBrace, lastBrace + 1);
          const cleanedJsonString = this.cleanJsonString(jsonString);
          console.log("Extracted and cleaned JSON:\n", cleanedJsonString);
          
          // Debug: analyze the characters around common problem positions
          console.log("Character analysis around key positions:");
          for (let pos = 220; pos <= 235 && pos < cleanedJsonString.length; pos++) {
            const char = cleanedJsonString[pos];
            console.log(`Position ${pos}: '${char}' (code: ${char.charCodeAt(0)})`);
          }
          
          parsed = JSON.parse(cleanedJsonString);
        }

        this.validateRecipe(parsed); // <-- Validate the recipe

        await this.aiLogger.logEvent({
          kind: "extractIngredients",
          input: prompt,
          output: parsed,
          model: "gemini-1.5-flash",
          latencyMs: Date.now() - start,
        });

        return parsed; // Return on success
      } catch (err) {
        console.error(`Attempt ${i + 1} failed:`, err.message);
        lastError = err;
        if (i < 2) {
          await new Promise(r => setTimeout(r, 2000)); // Wait before retrying
        }
      }
    }

    // If all retries fail, log and throw the last error
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