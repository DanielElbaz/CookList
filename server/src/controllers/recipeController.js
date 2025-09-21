import Recipe from '../models/recipeSchema.js';
import mongoose from 'mongoose';
const { isValidObjectId } = mongoose;
import Ingredient from '../models/ingredientSchema.js';
import RecipeCreationService from '../../../ai/services/RecipeCreationService.js';


export const getAllRecipes = async (req, res) => {
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
}; // works


export const getRecipeByIngredients = async (req, res) => {
    try {
        const { list } = req.query;
        const ingredientIds = list.split(',').map(id => id.trim());
        const recipes = await Recipe.find({ 'ingredients.ingredientId': { $in: ingredientIds } })
            .populate('ingredients.ingredientId', 'canonicalName')
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

export const createRecipe = async (req, res) => {
    try {
        const { title, photoUrl, tags, category, difficulty, prepTime, steps, ingredients } = req.body;
        if (!title || !ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
            return res.status(400).json({ success: false, message: 'Title and at least one ingredient are required' });
        }

        // Convert ingredient names to ObjectIds
        const ingredientDocs = [];
        for (const ing of ingredients) {
            // ing should be { name, qty, unit }
            const ingredientDoc = await Ingredient.findOne({ canonicalName: ing.name });
            if (!ingredientDoc) {
                return res.status(400).json({ success: false, message: `Ingredient not found: ${ing.name}` });
            }
            ingredientDocs.push({
                ingredientId: ingredientDoc._id,
                name: ing.name,
                qty: ing.qty,
                unit: ing.unit
            });
        }

        const formattedTags = Array.isArray(tags) ? tags : (tags ? tags.split(',') : []);
        const formattedSteps = Array.isArray(steps) ? steps : [];
        const newRecipe = new Recipe({
            title,
            photoUrl,
            tags: formattedTags,
            category,
            difficulty,
            prepTime,
            steps: formattedSteps,
            ingredients: ingredientDocs
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
}; // works

export const generateRecipe = async (req, res) => {
    try {
        const raw =
            typeof req.body?.recipeText === 'string' ? req.body.recipeText :
                typeof req.body?.text === 'string' ? req.body.text :
                    typeof req.query?.recipeText === 'string' ? req.query.recipeText :
                        typeof req.query?.text === 'string' ? req.query.text :
                            '';
        const userText = raw.slice(0, 2000);

        const generated = userText ? await RecipeCreationService.createFromText(userText) : await RecipeCreationService.createFromText()
        console.log(generated)
        console.log("finished print generated")
        // Convert ingredient names to ObjectIds
        const ingredientDocs = [];
        for (const ing of generated.ingredients) {
            const ingredientDoc = await Ingredient.findOne({ canonicalName: ing.name });
            if (!ingredientDoc) {
                return res.status(400).json({ success: false, message: `Ingredient not found: ${ing.name}` });
            }
            ingredientDocs.push({
                ingredientId: ingredientDoc._id,
                qty: ing.qty,
                unit: ing.unit
            });
        }

        const newRecipe = new Recipe({
            title: generated.title,
            photoUrl: generated.photoUrl,
            tags: generated.tags,
            category: generated.category,
            difficulty: generated.difficulty,
            prepTime: generated.prepTime,
            steps: generated.steps,
            ingredients: ingredientDocs
        });

        await newRecipe.save();
        const populatedRecipe = await Recipe.findById(newRecipe._id)
            .populate('ingredients.ingredientId', 'name')
            .select('-__v')
            .lean();
        console.log(populatedRecipe)
        res.status(201).json({ success: true, data: populatedRecipe });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
} //works

export const updateRecipe = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: 'Invalid recipe id' });
        }
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({ success: false, message: 'Empty body' });
        }

        const { title, photoUrl, tags, steps, ingredients } = req.body;
        const update = {};

        if (title !== undefined) update.title = title;
        if (photoUrl !== undefined) update.photoUrl = photoUrl;

        if (tags !== undefined) {
            update.tags = Array.isArray(tags)
                ? tags
                : (typeof tags === 'string'
                    ? tags.split(',').map(t => t.trim()).filter(Boolean)
                    : []);
        }

        if (steps !== undefined) {
            update.steps = Array.isArray(steps) ? steps : [];
        }

        if (ingredients !== undefined) {
            if (!Array.isArray(ingredients) || ingredients.length === 0) {
                return res.status(400).json({ success: false, message: 'ingredients must be a non-empty array' });
            }
            update.ingredients = ingredients;
        }

        const updated = await Recipe.findByIdAndUpdate(
            id,
            { $set: update },
            { new: true, runValidators: true }
        )
            .select('-__v')
            .populate('ingredients.ingredientId', 'name')
            .lean();

        if (!updated) {
            return res.status(404).json({ success: false, message: 'Recipe not found' });
        }
        return res.status(200).json({ success: true, data: updated });
    } catch (error) {
        console.error(error);
        if (error?.name === 'CastError') {
            return res.status(400).json({ success: false, message: 'Invalid recipe id' });
        }
        return res.status(500).json({ success: false, message: 'Server Error' });
    }
};


export const deleteRecipe = async (req, res) => {
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
}; //works


