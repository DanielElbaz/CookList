import { Schema, model, Types } from "mongoose";

const IngredientRefSchema = new Schema({
    ingredientId: { type: Types.ObjectId, ref: 'Ingredient', required: true },
    ingredientName: { type: String, ref:'Ingredient',trim: true },
    qty: { type: Number, required: true, min: 0 },
    unit: { type: String, trim: true }
}, { _id: false });

const RecipeSchema = new Schema({
    title: { type: String, required: true, trim: true },
    photoUrl: { type: String, trim: true },
    tags: { type: [String], default: [], required: true },
    steps: { type: [String], default: [] },
    ingredients: [IngredientRefSchema]
}, { _id: true });

const Recipe = model('Recipe', RecipeSchema);
export default Recipe;