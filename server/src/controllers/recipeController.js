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
            .select('title photoUrl tags category difficulty prepTime steps ingredients')
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

        // Convert ingredient names to ObjectIds, create missing ingredients
        const ingredientDocs = [];
        const missingIngredients = [];
        
        for (const ing of ingredients) {
            // ing should be { name, qty, unit }
            let ingredientDoc = await Ingredient.findOne({ 
                $or: [
                    { canonicalName: ing.name },
                    { name: ing.name }
                ]
            });
            
            if (!ingredientDoc) {
                // Create missing ingredient automatically
                try {
                    ingredientDoc = new Ingredient({
                        name: ing.name,
                        canonicalName: ing.name.toLowerCase(),
                        dept: 'אחר'  // default department
                    });
                    await ingredientDoc.save();
                    console.log(`Created new ingredient: ${ing.name}`);
                } catch (ingredientError) {
                    console.error(`Error creating ingredient ${ing.name}:`, ingredientError);
                    missingIngredients.push(ing.name);
                    // Continue with text-only ingredient if creation fails
                }
            }
            
            if (ingredientDoc) {
                ingredientDocs.push({
                    ingredientId: ingredientDoc._id,
                    ingredientName: ing.name,  // Fixed: use ingredientName to match schema
                    qty: ing.qty,
                    unit: ing.unit
                });
            } else {
                // Add as text-only ingredient if creation failed
                ingredientDocs.push({
                    ingredientName: ing.name,
                    qty: ing.qty,
                    unit: ing.unit,
                    textOnly: true
                });
            }
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
            
        // Prepare response message
        let message = 'המתכון נוסף בהצלחה!';
        if (missingIngredients.length > 0) {
            message += ` ${missingIngredients.length} מרכיבים לא יכלו להיווצר: ${missingIngredients.join(', ')}`;
        }
        
        res.status(201).json({ 
            success: true, 
            data: populatedRecipe,
            message: message
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

export const generateRecipe = async (req, res) => {
    try {
        const raw =
            typeof req.body?.prompt === 'string' ? req.body.prompt :
                typeof req.body?.recipeText === 'string' ? req.body.recipeText :
                    typeof req.body?.text === 'string' ? req.body.text :
                        typeof req.query?.recipeText === 'string' ? req.query.recipeText :
                            typeof req.query?.text === 'string' ? req.query.text :
                                '';
        const userText = raw.slice(0, 2000);

        const generated = userText ? await RecipeCreationService.createFromText(userText) : await RecipeCreationService.createFromText()
        console.log(generated)
        console.log("finished print generated")
        // Convert ingredient names to ObjectIds, create missing ingredients
        const ingredientDocs = [];
        for (const ing of generated.ingredients) {
            let ingredientDoc = await Ingredient.findOne({ canonicalName: ing.name });
            if (!ingredientDoc) {
                // Create missing ingredient
                try {
                    ingredientDoc = new Ingredient({
                        name: ing.name,
                        canonicalName: ing.name.toLowerCase(),
                        dept: 'אחר'
                    });
                    await ingredientDoc.save();
                    console.log(`Created new ingredient for AI recipe: ${ing.name}`);
                } catch (ingredientError) {
                    console.error(`Error creating ingredient ${ing.name}:`, ingredientError);
                    // Continue with text-only ingredient if creation fails
                }
            }
            
            if (ingredientDoc) {
                ingredientDocs.push({
                    ingredientId: ingredientDoc._id,
                    ingredientName: ing.name,  // Fixed: use ingredientName to match schema
                    qty: ing.qty,
                    unit: ing.unit
                });
            } else {
                // Add as text-only ingredient
                ingredientDocs.push({
                    ingredientName: ing.name,  // Fixed: use ingredientName to match schema
                    qty: ing.qty,
                    unit: ing.unit,
                    textOnly: true
                });
            }
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
        
        console.log('Saved AI recipe:', populatedRecipe);
        console.log('AI recipe ingredients:', populatedRecipe.ingredients);
        
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


