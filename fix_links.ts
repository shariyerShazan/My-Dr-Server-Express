import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), ".env") });

mongoose.connect(process.env.DATABASE_URL || "")
  .then(async () => {
    console.log("Connected to MongoDB.");
    const Appointment = mongoose.connection.collection("appointments");
    
    // Check for missing links
    const withoutLinks = await Appointment.find({ type: "TELEMEDICINE", meetLink: { $exists: false } }).toArray();
    console.log(`Found ${withoutLinks.length} TELEMEDICINE appointments without a meetLink.`);
    
    // Auto-generate for those missing
    let updated = 0;
    for (const appt of withoutLinks) {
       const roomId = `${String(appt.patient).slice(-4)}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
       const meetLink = `https://meet.jit.si/mydr-${roomId}`;
       await Appointment.updateOne({ _id: appt._id }, { $set: { meetLink } });
       updated++;
    }
    console.log(`Updated ${updated} appointments with new meetLinks.`);

    const appts = await Appointment.find({}).sort({ createdAt: -1 }).limit(5).toArray();
    console.log("Latest 5 Appointments:", appts.map(a => ({ type: a.type, meetLink: !!a.meetLink, date: a.createdAt })));
    
    process.exit(0);
  }).catch(e => {
    console.error(e);
    process.exit(1);
  });
