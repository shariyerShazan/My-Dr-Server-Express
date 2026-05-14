import mongoose, { Schema, Document } from "mongoose";
import type { IUser } from "./User.js";
import type { IDepartment } from "./Department.js";

export interface IDoctor extends Document {
  user: IUser["_id"];
  department: IDepartment["_id"];
  firstName: string;
  lastName: string;
  specialization: string;
  experienceYears: number;
  bio?: string;
  contactNumber: string;
  consultationFee: number;
  availability: {
    weeklySchedule: {
      day: string;
      isActive: boolean;
      startTime: string;
      endTime: string;
    }[];
    slotDurationMinutes: number;
    maxAppointmentsPerDay: number;
    offDays: string[];
  };
  stripeId?: string;
  stripeAccountId?: string;
  isStripeConnected: boolean;
  isStripeAccountVerified: boolean;
  stripeOnboardingComplete: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DoctorSchema: Schema = new Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: false,
    },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    specialization: { type: String, required: true },
    experienceYears: { type: Number, required: true },
    bio: { type: String },
    contactNumber: { type: String, required: true },
    consultationFee: { type: Number, required: true },
    availability: {
      weeklySchedule: [
        {
          day: { type: String, default: "Saturday" },
          isActive: { type: Boolean, default: true },
          startTime: { type: String, default: "09:00" },
          endTime: { type: String, default: "17:00" },
        },
        {
          day: { type: String, default: "Sunday" },
          isActive: { type: Boolean, default: true },
          startTime: { type: String, default: "09:00" },
          endTime: { type: String, default: "17:00" },
        },
        {
          day: { type: String, default: "Monday" },
          isActive: { type: Boolean, default: true },
          startTime: { type: String, default: "09:00" },
          endTime: { type: String, default: "17:00" },
        },
        {
          day: { type: String, default: "Tuesday" },
          isActive: { type: Boolean, default: true },
          startTime: { type: String, default: "09:00" },
          endTime: { type: String, default: "17:00" },
        },
        {
          day: { type: String, default: "Wednesday" },
          isActive: { type: Boolean, default: true },
          startTime: { type: String, default: "09:00" },
          endTime: { type: String, default: "17:00" },
        },
        {
          day: { type: String, default: "Thursday" },
          isActive: { type: Boolean, default: true },
          startTime: { type: String, default: "09:00" },
          endTime: { type: String, default: "17:00" },
        },
        {
          day: { type: String, default: "Friday" },
          isActive: { type: Boolean, default: false },
          startTime: { type: String, default: "09:00" },
          endTime: { type: String, default: "17:00" },
        },
      ],
      slotDurationMinutes: { type: Number, default: 30 },
      maxAppointmentsPerDay: { type: Number, default: 20 },
      offDays: { type: [String], default: [] },
    },
    stripeId: { type: String },
    stripeAccountId: { type: String },
    isStripeConnected: { type: Boolean, default: false },
    isStripeAccountVerified: { type: Boolean, default: false },
    stripeOnboardingComplete: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const Doctor = mongoose.model<IDoctor>("Doctor", DoctorSchema);
