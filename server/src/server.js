import 'dotenv/config';
import express from 'express';
import recipeRoutes from './routes/recipes.js';
import shoppingListRoutes from './routes/shoppingLists.js';
import cors from 'cors';
import { connectMongo } from './models/index.js';
import { loadCanonicalNames } from './utils/ingredientCache.js';

const app = express();
const PORT = process.env.PORT || 3000;

connectMongo(process.env.MONGODB_URI)
  .then(async () => {
    console.log('MongoDB connected');
    await loadCanonicalNames();
  })
  .catch(err => console.error('MongoDB connection error', err));


// Middleware to parse JSON bodies
const allowedOrigins = [
  "http://localhost:5173",                 
  "https://cooklist-frontend.onrender.com"    
];

app.use(cors({
  origin: function (origin, callback) {
    // autoriser sans origin (ex: Postman) ou si origin est dans la liste
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));
app.use(express.json());


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
