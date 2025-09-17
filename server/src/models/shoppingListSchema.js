const { Schema, model, Types } = require('mongoose');

const ListItemSchema = new Schema({
    ingredientId: { type: Types.ObjectId, ref: 'Ingredient', required: true },
    qty: { type: Number, required: true, min: 0 },
    unit: { type: String, trim: true }, 
    picked: { type: Boolean, default: false }
}, { _id: true });

const ShoppingListSchema = new Schema({
    userId: { type: Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    status: { type: String, enum: ['open', 'done'], default: 'open' },
    items: { type: [ListItemSchema], default: [] },
    source: {
        recipeIds: { type: [Types.ObjectId], ref: 'Recipe', default: [] },
        notes: { type: String, trim: true }
    }
}, { timestamps: true });

const ShoppingList = model('ShoppingList', ShoppingListSchema);
module.exports = ShoppingList;
