import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

class Database {
  private static instance: Database;
  private isConnected = false;

  private constructor() {
    // Private constructor for singleton
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public async connect(): Promise<void> {
    if (this.isConnected) {
      console.log('Already connected to MongoDB');
      return;
    }

    try {
      const uri = process.env.DATABASE_URL!
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
      });
      this.isConnected = true;
      console.log('🔥 Successfully connected to MongoDB');
    } catch (error: any) {
      console.error('\n❌ MongoDB connection error:', error.message);
      
      if (error.message && error.message.includes('SSL alert number 80')) {
         console.warn('\n=========================================');
         console.warn('⚠️  MONGODB ATLAS IP WHITELIST ERROR!   ⚠️');
         console.warn('=========================================');
         console.warn('This SSL/TLS alert 80 usually means your current wifi/internet IP address is NOT whitelisted in your MongoDB Atlas Dashboard.');
         console.warn('-> Go to https://cloud.mongodb.com');
         console.warn('-> Select "Network Access" on the left sidebar');
         console.warn('-> Click "ADD IP ADDRESS" -> "ADD CURRENT IP ADDRESS" -> Confirm.');
         console.warn('-> Wait 1-2 minutes and restart this server.');
         console.warn('=========================================\n');
      }

      console.log('⚠️  Server will start in offline mode due to this error.');
      // Do NOT process.exit(1) so the express API still starts
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) return;
    try {
      await mongoose.connection.close();
      this.isConnected = false;
      console.log('MongoDB disconnected.');
    } catch (error) {
      console.error('MongoDB disconnection error:', error);
    }
  }
}

export default Database.getInstance();
