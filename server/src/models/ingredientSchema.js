import { Schema, model } from "mongoose";

const DEPTS = [
  "פירות וירקות",
  "מוצרי חלב",
  "מאפייה",
  "בשר ודגים",
  "מצרכים יבשים",
  "מוצרים קפואים",
  "משקאות",
  "מוצרי בית",
  "אחר"
];

const IngredientSchema = new Schema({
  name: { type: String, required: true, trim: true,unique: true },
  canonicalName: { type: String, required: true, trim:true },
  tags: { type: [String], default: [] },
  dept: { type: String, enum: DEPTS, required: true },

},{ _id: true })

const Ingredient = model('Ingredient', IngredientSchema);
export default Ingredient
const _DEPTS = DEPTS;
export { _DEPTS as DEPTS };