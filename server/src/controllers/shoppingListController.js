// controllers/shoppingListController.js
const mongoose = require('mongoose');
const ShoppingList = require('../models/shoppingListSchema');
const Recipe = require('../models/recipeSchema');
const Ingredient = require('../models/ingredientSchema');

const { isValidObjectId } = mongoose;

exports.buildList = async (req, res) => {
    
    try {
        const { userId, title = "רשימת קניות", recipeIds = [], notes } = req.body;

        if (!userId || !Array.isArray(recipeIds) || recipeIds.length === 0) {
            return res.status(400).json({ success: false, message: 'userId et recipeIds[] sont requis' });
        }

        const recipes = await Recipe.find({ _id: { $in: recipeIds } })
            .populate('ingredients.ingredientId', 'name dept') 
            .lean();

        const flattened = []; // to extract the ingredients
        for (const r of recipes) {
            for (const ing of r.ingredients) {
                const ingDoc = ing.ingredientId;
                if (!ingDoc || !ingDoc._id) continue;

                
                const normalized = normalizeUnit(
                    { ingredientId: ingDoc._id, qty: ing.qty, unit: ing.unit },
                    ingDoc.dept
                );

                flattened.push(normalized);
            }
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

exports.getListById = async (req, res) => {
    // TODO: renvoyer une liste par son id
};

exports.updateItem = async (req, res) => {
    // TODO: mettre à jour un item précis
};

exports.updateStatus = async (req, res) => {
    // TODO: changer le status de la liste (open/done)
};
