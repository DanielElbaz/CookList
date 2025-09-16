const { Schema, model, Types } = require("mongoose");

const RecipeSchema = new Schema({
    title: { type: String, required: true, trim: true },
    photoUrl: { type: String, trim: true },
    tags: { type: [String], default: [], required: true },
    steps: { type: [String], default: [] },
    ingredients: [{
        ingredientId: { type: Types.ObjectId, ref: 'Ingredient', required: true },
        qty: { type: Number, required: true, min: 0 },
        unit: { type: String, trim: true }
    }]
},{ _id: true })

const Recipe = model('Recipe', RecipeSchema);
module.exports = Recipe;