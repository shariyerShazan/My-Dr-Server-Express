import mongoose, { Schema, Document } from "mongoose";
import type { IDoctor } from "./Doctor.js";
import type { IPatient } from "./Patient.js";
import type { IAppointment } from "../appointment/appointment.model.js";

export enum PaymentStatus {
  PAID = "PAID",
  UNPAID = "UNPAID",
  REFUNDED = "REFUNDED",
}

export interface IFinance extends Document {
  doctor: IDoctor["_id"];
  patient: IPatient["_id"];
  appointment: IAppointment["_id"];
  amount: number;
  status: PaymentStatus;
  paymentMethod?: string; // e.g., "MFS", "CARD", "CASH"
  transactionId?: string;
  paymentDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const FinanceSchema: Schema = new Schema(
  {
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
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      required: true,
    },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.UNPAID,
    },
    paymentMethod: { type: String },
    transactionId: { type: String },
    paymentDate: { type: Date },
  },
  { timestamps: true },
);

export const Finance = mongoose.model<IFinance>("Finance", FinanceSchema);
