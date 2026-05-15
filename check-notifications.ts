import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

async function checkNotifications() {
  await mongoose.connect(process.env.DATABASE_URL!);
  console.log("✅ Connected to MongoDB");

  const Notification = mongoose.model("Notification", new mongoose.Schema({
    recipient: mongoose.Schema.Types.ObjectId,
    title: String,
    message: String,
    type: String,
    link: String,
    isRead: Boolean,
    createdAt: Date
  }));

  const count = await Notification.countDocuments();
  console.log(`📊 Total notifications in DB: ${count}`);

  const samples = await Notification.find().sort({ createdAt: -1 }).limit(5).lean();
  console.log("📋 Latest 5 notifications:");
  samples.forEach((n, i) => {
    console.log(`  ${i+1}. [${n.type}] "${n.title}" → recipient: ${n.recipient} | read: ${n.isRead}`);
  });

  // Check each recipient
  if (samples.length > 0 && samples[0]) {
    const recipientId = samples[0].recipient;
    const recipientCount = await Notification.countDocuments({ recipient: recipientId as any } as any);
    console.log(`\n👤 Notifications for recipient ${recipientId}: ${recipientCount}`);
  }

  await mongoose.disconnect();
  console.log("✅ Done");
}

checkNotifications().catch(console.error);
