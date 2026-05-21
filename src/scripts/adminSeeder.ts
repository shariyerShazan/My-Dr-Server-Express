import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { User, UserRole } from "../models/User.js";

dotenv.config();
//
const seedAdmin = async () => {
  try {
    const uri = process.env.DATABASE_URL || "mongodb://localhost:27017/my-dr";
    await mongoose.connect(uri);
    console.log("Connected to MongoDB for seeding...");

    const adminEmail = process.env.ADMIN_EMAIL!;
    const authPass = process.env.ADMIN_PASS!;

    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      console.log("CLINIC_ADMIN already exists in database.");
      process.exit(0);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(authPass, salt);

    const admin = await User.create({
      email: adminEmail,
      passwordHash,
      role: UserRole.CLINIC_ADMIN,
      isActive: true,
    });

    console.log("✅ Successfully seeded CLINIC_ADMIN: " + admin.email);
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding admin:", error);
    process.exit(1);
  }
};

seedAdmin();
