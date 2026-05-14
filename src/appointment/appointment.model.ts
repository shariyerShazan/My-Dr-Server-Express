import mongoose, { Schema, Document } from "mongoose";
import type { IPatient } from "../models/Patient.js";
import type { IDoctor } from "../models/Doctor.js";
import type { IDepartment } from "../models/Department.js";


export enum AppointmentStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED"
}

export enum AppointmentType {
  IN_PERSON = "IN_PERSON",
  TELEMEDICINE = "TELEMEDICINE"
}

export interface IAppointment extends Document {
  patient: IPatient["_id"];
  doctor: IDoctor["_id"];
  department: IDepartment["_id"];
  appointmentDate: Date;
  timeSlot: string;
  status: AppointmentStatus;
  type: AppointmentType;
  symptoms: string;
  notes?: string;
  paymentStatus: "PENDING" | "PAID" | "FAILED";
  stripeSessionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AppointmentSchema: Schema = new Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
    appointmentDate: { type: Date, required: true },
    timeSlot: { type: String, required: true },
    status: { type: String, enum: Object.values(AppointmentStatus), default: AppointmentStatus.PENDING },
    type: { type: String, enum: Object.values(AppointmentType), default: AppointmentType.IN_PERSON },
    symptoms: { type: String },
    notes: { type: String },
    paymentStatus: { type: String, enum: ["PENDING", "PAID", "FAILED"], default: "PENDING" },
    stripeSessionId: { type: String }
  },
  { timestamps: true }
);

export const Appointment = mongoose.model<IAppointment>("Appointment", AppointmentSchema);
