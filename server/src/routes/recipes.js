const express = require('express');
const router = express.Router();
const recipeController = require('../controllers/recipeController');

// Get all recipes -> Search/filter recipes
router.get('/', recipeController.getAllRecipes);

// Get recipes by ingredient(s)
router.get('/by-ingredients', recipeController.getRecipeByIngredients);

// Create a new recipe
router.post('/', recipeController.createRecipe);

// Update a recipe (admin only)
router.put('/:id', recipeController.updateRecipe);

// Delete a recipe (admin only)
router.delete('/:id', recipeController.deleteRecipe);

module.exports = router;
