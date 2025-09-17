const express = require('express');
const router = express.Router();
const shoppingListController = require('../controllers/shoppingListController');

// Build a new shopping list from recipes
router.post('/build', shoppingListController.buildList);

// Get a shopping list
router.get('/:id', shoppingListController.getListById);


// Update an item in the shopping list
router.put('/:id/items/:itemId', shoppingListController.updateItem);
  

// Update the status of a shopping list
router.put('/:id/status', shoppingListController.updateStatus);

module.exports = router;
