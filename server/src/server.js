require('dotenv').config();
const express = require('express');
const recipeRoutes = require('./routes/recipes');
const shoppingListRoutes = require('./routes/shoppingLists');
const app = express();
const cors=require('cors')
const PORT = process.env.PORT || 3000;
const { connectMongo } = require('./models/index');

connectMongo(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error', err));


// Middleware to parse JSON bodies
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

const Ingredient = require('./models/ingredientSchema');

app.get('/_debug/ingredient/:id', async (req, res) => {
  const ing = await Ingredient.findById(req.params.id).lean();
  res.json({
    uri: process.env.MONGODB_URI,
    db:Ingredient.db.name,
    collection:Ingredient.collection.name,
    exists: !!ing,
    ing
  });
});

// Mount the recipe routes
app.use('/recipes', recipeRoutes);
app.use('/lists', shoppingListRoutes);

// A simple root endpoint for health checks
app.get('/', (req, res) => {
  res.status(200).send('CookList API is running!');
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
