const express = require('express');
const router = express.Router();
const recipeController = require('../controllers/recipeController');

// GET /recipes?search=&tag=&limit=&skip= -> Search/filter recipes
router.get('/', recipeController.getAllRecipes);


// GET /recipes/:ingredients -> Get recipes by ingredient(s)
router.get('/by-ingredients', recipeController.getRecipeByIngredients);

// POST /recipes -> Create a new recipe
router.post('/', recipeController.createRecipe);

// DELETE /recipes/:id -> Delete a recipe (admin only)
router.delete('/:id', recipeController.deleteRecipe);

module.exports = router;
