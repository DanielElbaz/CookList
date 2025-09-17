import Ingredient from '../models/ingredientSchema.js';

let canonicalNamesCache = null;

export async function loadCanonicalNames() {
  if (!canonicalNamesCache) {
    const docs = await Ingredient.find({}, 'canonicalName').lean();
    canonicalNamesCache = docs.map(d => d.canonicalName);
  }
  return canonicalNamesCache;
}

export function getCanonicalNames() {
  if (!canonicalNamesCache) {
    throw new Error("Canonical names not loaded yet. Call loadCanonicalNames() first.");
  }
  return canonicalNamesCache;
}
