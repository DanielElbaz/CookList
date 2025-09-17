const { Schema, model } = require("mongoose");

const DEPTS = [
  "פירות וירקות",
  "מוצרי חלב",
  "מאפייה",
  "בשר ודגים",
  "מצרכים יבשים",
  "מוצרים קפואים",
  "משקאות",
  "מוצרי בית"
];

const IngredientSchema = new Schema({
  name: { type: String, required: true, trim: true,unique: true },
  canonicalName: { type: String, required: true, trim:true },
  tags: { type: [String], default: [] },
  dept: { type: String, enum: DEPTS, required: true },

},{ _id: true })

const Ingredient = model('Ingredient', IngredientSchema);
module.exports = Ingredient
module.exports.DEPTS = DEPTS;