import { Schema, model, Types } from 'mongoose';

const ListItemSchema = new Schema({
    ingredientId: { type: Types.ObjectId, ref: 'Ingredient', required: true },
    qty: { type: Number, required: true, min: 0 },
    unit: { type: String, trim: true }, 
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
