const Recipe = require('../models/recipeSchema')
const mongoose = require('mongoose');
const { isValidObjectId } = mongoose;

exports.getAllRecipes = async (req, res) => {
    try {
        const { search, tags, limit = 150 } = req.query;
        const limitNum = Math.min(parseInt(limit, 10) || 300, 500);

        const query = {};
        if (search) {
            query.title = { $regex: search, $options: 'i' };
        }
        if (tags) {
            query.tags = { $in: tags.split(',') };
        }

        const recipes = await Recipe.find(query)
            .select('title photoUrl tags steps ingredients')
            .populate('ingredients.ingredientId', 'name')
            .limit(limitNum)
            .lean(); 

        res.status(200).json({
            success: true,
            data: recipes,
            total: recipes.length
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};


exports.getRecipeByIngredients = async (req, res) => {
    try {
        const { list } = req.query; // expecting a comma-separated list of ingredient IDs
        const ingredientIds = list.split(',').map(id => id.trim());
        const recipes = await Recipe.find({ 'ingredients.ingredientId': { $in: ingredientIds } })
            .populate('ingredients.ingredientId', 'name')
            .lean();
        res.status(200).json({
            success: true,
            data: recipes
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

exports.createRecipe = async (req, res) => {
    try {
        const { title, photoUrl, tags, steps, ingredients } = req.body;
        if (!title || !ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
            return res.status(400).json({ success: false, message: 'Title and at least one ingredient are required' });
        }
        const formattedTags = Array.isArray(tags) ? tags : (tags ? tags.split(',') : []);
        const formattedSteps = Array.isArray(steps) ? steps : [];
        const newRecipe = new Recipe({
            title,
            photoUrl,
            tags: formattedTags,
            steps: formattedSteps,
            ingredients
        });

        await newRecipe.save();
        const populatedRecipe = await Recipe.findById(newRecipe._id)
            .populate('ingredients.ingredientId', 'name')
            .select('-__v')
            .lean();
        res.status(201).json({ success: true, data: populatedRecipe });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};


exports.deleteRecipe = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: 'Invalid recipe id' });
        }
        const recipe = await Recipe.findByIdAndDelete(id);
        if (!recipe) {
            return res.status(404).json({ success: false, message: 'Recipe not found' });
        }
        res.status(200).json({ success: true, message: 'Recipe deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};


