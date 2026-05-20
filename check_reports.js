import mongoose from "mongoose";
import { Report } from "./src/models/Report.js";
import { Patient } from "./src/models/Patient.js";
import { User } from "./src/models/User.js";
import dotenv from "dotenv";

dotenv.config();

async function check() {
  await mongoose.connect(process.env.DATABASE_URL);
  console.log("Connected to DB");

  const reports = await Report.find();
  console.log(`Total Reports in DB: ${reports.length}`);

  if (reports.length > 0) {
    console.log("Sample Report:", JSON.stringify(reports[0], null, 2));
    const pId = reports[0].patient;
    const patient = await Patient.findById(pId);
    console.log("Associated Patient:", JSON.stringify(patient, null, 2));
    if (patient) {
        const user = await User.findById(patient.user);
        console.log("Associated User:", JSON.stringify(user, null, 2));
    }
  }

  await mongoose.disconnect();
}

check();
