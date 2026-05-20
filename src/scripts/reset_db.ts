import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

async function resetDB() {
  try {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL not found in .env");

    console.log("Connecting for Database Reset...");
    await mongoose.connect(url);
    
    // Get all collections
    const collections = await (mongoose as any).connection.db.listCollections().toArray();
    console.log(`Clearing ${collections.length} collections...`);

    for (const collection of collections) {
      console.log(`Dropping: ${collection.name}`);
      await  (mongoose as any).connection.db.dropCollection(collection.name);
    }

    console.log("Database reset complete.");
  } catch (error) {
    console.error("Reset Failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected.");
  }
}

resetDB();
