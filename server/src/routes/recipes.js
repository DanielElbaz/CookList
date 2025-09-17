import express from 'express';
const router = express.Router();
import * as recipeController from '../controllers/recipeController.js';

// Get all recipes -> Search/filter recipes
router.get('/', recipeController.getAllRecipes);

// Get recipes by ingredient(s)
router.get('/by-ingredients', recipeController.getRecipeByIngredients);

// Create a new recipe
router.post('/', recipeController.createRecipe);

//Create a new recipe with Gemini
router.post('/generate',recipeController.generateRecipe)

// Update a recipe (admin only)
router.put('/:id', recipeController.updateRecipe);

// Delete a recipe (admin only)
router.delete('/:id', recipeController.deleteRecipe);

export default router;
