import { connectMongo } from "../../server/src/models/index.js";
import { loadCanonicalNames } from "../../server/src/utils/ingredientCache.js";
import RecipeCreationService from "./RecipeCreationService.js";

async function test() {
  await connectMongo(process.env.MONGODB_URI)
  await loadCanonicalNames();
  const recipe = await RecipeCreationService.createFromText("Chicken with potatoes");
  console.log(recipe);
}

test();