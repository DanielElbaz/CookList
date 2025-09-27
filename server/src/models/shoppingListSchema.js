import { Schema, model, Types } from 'mongoose';

const ListItemSchema = new Schema({
    ingredientId: { type: Types.ObjectId, ref: 'Ingredient', required: false }, // Allow null for missing ingredients
    ingredientName: { type: String, trim: true }, // For fallback when populate fails or missing ingredients
    dept: { type: String, trim: true }, // Department/category for grouping
    qty: { type: Number, required: true, min: 0 },
    unit: { type: String, trim: true },
    checked: { type: Boolean, default: false }, // For tracking completion status
    isMissing: { type: Boolean, default: false }, // Flag for missing ingredients
}, { _id: true });

const ShoppingListSchema = new Schema({
    // userId: { type: Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    status: { type: String, enum: ['open', 'done'], default: 'open' },
    items: { type: [ListItemSchema], default: [] },
    source: {
        recipeIds: { type: [Types.ObjectId], ref: 'Recipe', default: [] }
    }
}, { timestamps: true });

const ShoppingList = model('ShoppingList', ShoppingListSchema);
export default ShoppingList;
