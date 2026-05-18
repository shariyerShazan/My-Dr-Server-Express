import mongoose, { Schema, Document } from "mongoose";
import type { IAppointment } from "../appointment/appointment.model.js";
import type { IDoctor } from "./Doctor.js";
import type { IPatient } from "./Patient.js";

export enum CallStatus {
  SCHEDULED = "SCHEDULED",
  ONGOING = "ONGOING",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export interface ITelemedicine extends Document {
  appointment: IAppointment["_id"];
  doctor: IDoctor["_id"];
  patient: IPatient["_id"];
  joinUrl: string;
  meetingId: string;
  status: CallStatus;
  startedAt?: Date;
  endedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TelemedicineSchema: Schema = new Schema(
  {
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      required: true,
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    joinUrl: { type: String, required: true },
    meetingId: { type: String, required: true },
    status: {
      type: String,
      enum: Object.values(CallStatus),
      default: CallStatus.SCHEDULED,
    },
    startedAt: { type: Date },
    endedAt: { type: Date },
  },
  { timestamps: true },
);

export const Telemedicine = mongoose.model<ITelemedicine>(
  "Telemedicine",
  TelemedicineSchema,
);
