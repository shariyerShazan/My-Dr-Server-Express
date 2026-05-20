import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

mongoose.connect(process.env.MONGO_URI || "mongodb+srv://shariyer:shariyer1234@cluster0.vxy4o.mongodb.net/MyDr")
  .then(async () => {
    const Appointment = mongoose.connection.collection("appointments");
    const appts = await Appointment.find({}).sort({ createdAt: -1 }).limit(5).toArray();
    console.log("Latest Appointments:", appts.map(a => ({ id: a._id, type: a.type, meetLink: a.meetLink, createdAt: a.createdAt, status: a.adminApprovalStatus })));
    process.exit(0);
  });
