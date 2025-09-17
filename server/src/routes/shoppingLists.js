import express from 'express';
const router = express.Router();
import * as shoppingListController from '../controllers/shoppingListController.js';

// Build a new shopping list from recipes
router.post('/build', shoppingListController.buildList);

// Get a shopping list
router.get('/:id', shoppingListController.getListById);


// Update an item in the shopping list
router.put('/:id/items/:itemId', shoppingListController.updateItem);
  

// Update the status of a shopping list
router.put('/:id/status', shoppingListController.updateStatus);

export default router;
