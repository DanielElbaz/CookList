import fs from "fs/promises";
import path from "path";
import RecipeCreationService from "./RecipeCreationService.js";

class BulkRecipeSeederService {
  constructor(outputDir = "./output") {
    this.outputDir = outputDir;
  }

  normalizeRecipe(raw) {
    return {
      title: raw.title || "מתכון ללא כותרת",
      photoUrl: raw.photoUrl || null,
      tags: Array.isArray(raw.tags) ? raw.tags : [],
      steps: Array.isArray(raw.steps) ? raw.steps : [],
      ingredients: Array.isArray(raw.ingredients)
        ? raw.ingredients.map(i => ({
          name: i.name || "לא ידוע",
          qty: i.qty ? Number(i.qty) || i.qty : 0,
          unit: i.unit || "",
        }))
        : [],
    };
  }

  async seed(count = 10) {
    const results = [];
    const recipes = [
      "ספגטי ברוטב עגבניות",
      "עוף בתנור",
      "בקר עם אורז",
      "תבשיל ירקות",
      "שקשוקה",
      "נודלס עם ירקות",
      "סלט יווני",
      "מרק עדשים",
      "דג טונה",
      "עוגת שוקולד"
    ];
    await fs.mkdir(this.outputDir, { recursive: true });

    for (let i = 0; i < count; i++) {
      try {
        const rawRecipe = await RecipeCreationService.createFromText(recipes[i]);
        const recipe = this.normalizeRecipe(rawRecipe);
        results.push({ success: true, recipe });
      } catch (err) {
        console.error("Failed to create recipe:", err.message);
        results.push({ success: false, error: err.message });
      }
    }

    const filePath = path.join(this.outputDir, "recipes.json");
    await fs.writeFile(filePath, JSON.stringify(results, null, 2), "utf-8");
    console.log(`Recipes saved to ${filePath}`);

    return results;
  }
}

export default BulkRecipeSeederService;