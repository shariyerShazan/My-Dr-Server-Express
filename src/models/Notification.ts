import mongoose, { Schema, Document } from "mongoose";

export enum NotificationType {
  APPOINTMENT = "APPOINTMENT",
  PRESCRIPTION = "PRESCRIPTION",
  REPORT = "REPORT",
  FINANCE = "FINANCE",
  USER_REGISTRATION = "USER_REGISTRATION",
  DOCTOR_VERIFICATION = "DOCTOR_VERIFICATION",
}

export interface INotification extends Document {
  recipient: mongoose.Types.ObjectId; // User ID
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
  isRead: boolean;
  createdAt: Date;
}

const NotificationSchema: Schema = new Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: Object.values(NotificationType),
      required: true,
    },
    link: { type: String },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const Notification = mongoose.model<INotification>(
  "Notification",
  NotificationSchema,
);
