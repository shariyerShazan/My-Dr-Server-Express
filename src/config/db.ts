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
      await mongoose.connect(uri);
      this.isConnected = true;
      console.log('🔥 Successfully connected to MongoDB');
    } catch (error) {
      console.error('❌ MongoDB connection error:', error);
      process.exit(1);
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
