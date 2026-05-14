import mongoose, { Schema, Document } from "mongoose";
import type { IPatient } from "../models/Patient.js";
import type { IDoctor } from "./Doctor.js";

export interface IReport extends Document {
  patient: IPatient['_id'];
  doctor?: IDoctor['_id'];
  testName: string;
  fileUrl: string;
  date: Date;
  summary?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReportSchema: mongoose.Schema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
    testName: { type: String, required: true },
    fileUrl: { type: String, required: true },
    date: { type: Date, required: true, default: Date.now },
    summary: { type: String }
  },
  { timestamps: true }
);

export const Report = mongoose.model<IReport>('Report', ReportSchema);
