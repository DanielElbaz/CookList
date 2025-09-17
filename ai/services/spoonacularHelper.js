import axios from "axios";
import geminiService from "./geminiService.js";

const SPOONACULAR_BASE = "https://api.spoonacular.com/recipes/complexSearch";
const SPOONACULAR_API_KEY = process.env.SPOONACULAR_API_KEY;
const PLACEHOLDER_IMAGE = "https://redthread.uoregon.edu/files/original/affd16fd5264cab9197da4cd1a996f820e601ee4.png";

async function translateToEnglish(hebrewTitle) {
  try {
    const prompt = `
Translate the following Hebrew recipe title into natural English, only output the translated text:
"${hebrewTitle}"
    `;
    const translation = await geminiService.generate(prompt);
    return translation.trim();
  } catch (err) {
    console.warn("Gemini translation failed, using original title:", err.message);
    return hebrewTitle;
  }
}

export async function getRecipeImage(hebrewTitle) {
  try {
    const englishTitle = await translateToEnglish(hebrewTitle);
    const url = `${SPOONACULAR_BASE}?query=${encodeURIComponent(englishTitle)}&number=1&apiKey=${SPOONACULAR_API_KEY}`;
    const response = await axios.get(url);

    if (response.data?.results?.length > 0) {
      const recipe = response.data.results[0];
      return recipe.image || PLACEHOLDER_IMAGE;
    }

    console.warn(`No image found for title: ${hebrewTitle}`);
    return PLACEHOLDER_IMAGE;
  } catch (err) {
    console.error("Error fetching Spoonacular image:", err.message);
    return PLACEHOLDER_IMAGE;
  }
}