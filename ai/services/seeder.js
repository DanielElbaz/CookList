// seedRecipes.js
import { connectMongo } from "../../server/src/models/index.js";
import { loadCanonicalNames } from "../../server/src/utils/ingredientCache.js";
import BulkRecipeSeederService from "./BulkRecipeSeederService.js";

const run = async () => {
    await connectMongo(process.env.MONGODB_URI)
    await loadCanonicalNames();
    const seeder = new BulkRecipeSeederService("./recipes"); // recipes folder
    await seeder.seed(5); // change number to however many recipes you want
};

run()
    .then(() => {
        console.log("Seeding done ✅");
        process.exit(0);
    })
    .catch(err => {
        console.error("Error in seeding:", err);
        process.exit(1);
    });
