import mongoose from 'mongoose';
import ShoppingList from '../models/shoppingListSchema.js';
import Recipe from '../models/recipeSchema.js';
import { DEPTS } from '../models/ingredientSchema.js';

const { isValidObjectId } = mongoose;

// util: groupage pour la réponse
function groupItemsByDept(populatedItems) {
  const byDept = {};
  for (const d of DEPTS) byDept[d] = [];

  for (const it of populatedItems) {
    const ing = it.ingredientId; // populated
    const dept = ing?.dept || 'מצרכים יבשים';
    const canonicalName = ing?.canonicalName || '—';

    (byDept[dept] ||= []).push({
      itemId: it._id,
      ingredientId: ing?._id,
      canonicalName,
      dept,
      qty: it.qty,
      unit: it.unit
    });
  }

  // tri alphabétique (hébreu-friendly)
  for (const d of Object.keys(byDept)) {
    byDept[d].sort((a, b) => (a.canonicalName || '').localeCompare(b.canonicalName || '', 'he'));
  }
  return byDept;
}

/**
 * POST /lists/build
 * Body: { title?: string, recipeIds: ObjectId[], notes?: string }
 * Effet: crée une ShoppingList "open" en DB, items agrégés par (ingredientId, unit)
 * Retour: listId + byDept
 */
export const buildList = async (req, res) => {
  try {
    const { title = 'רשימת קניות', recipeIds = []} = req.body;

    if (!Array.isArray(recipeIds) || recipeIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Provide recipeIds[]' });
    }
    for (const id of recipeIds) {
      if (!isValidObjectId(id)) {
        return res.status(400).json({ success: false, message: `Invalid recipe id: ${id}` });
      }
    }

    // Récupère les recettes et popule juste ce qu’il faut
    const recipes = await Recipe.find({ _id: { $in: recipeIds } })
      .populate('ingredients.ingredientId', 'canonicalName dept') // on a besoin de name + dept
      .lean();

    if (!recipes || recipes.length === 0) {
      return res.status(404).json({ success: false, message: 'No recipes found' });
    }

    // Agrège par (ingredientId + unit) — AUCUNE conversion
    // key = `${ingredientId}|${unit}`
    const agg = new Map();
    for (const r of recipes) {
      for (const ri of (r.ingredients || [])) {
        const ingDoc = ri.ingredientId; // populated doc
        if (!ingDoc?._id) continue;

        const unit = String(ri.unit || '').trim();
        const key = `${String(ingDoc._id)}|${unit}`;

        if (!agg.has(key)) {
          agg.set(key, { ingredientId: ingDoc._id, qty: 0, unit });
        }
        agg.get(key).qty += Number(ri.qty) || 0;
      }
    }

    const items = Array.from(agg.values()); // conforme à ListItemSchema

    // Création + sauvegarde en DB
    const list = await ShoppingList.create({
      title,
      status: 'open',
      items,
      source: { recipeIds}
    });

    // Re-populate pour renvoyer groupé par départements
    const populated = await ShoppingList.findById(list._id)
      .populate('items.ingredientId', 'canonicalName dept')
      .lean();

    const byDept = groupItemsByDept(populated.items);

    return res.status(201).json({
      success: true,
      data: {
        listId: populated._id,
        title: populated.title,
        status: populated.status,
        summary: {
          recipeCount: recipes.length,
          uniqueLines: items.length,
          totalItems: populated.items.length
        },
        byDept
      }
    });
  } catch (err) {
    console.error('buildList error:', err);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};