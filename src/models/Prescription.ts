import mongoose, { Schema, Document } from 'mongoose';
import type { IAppointment } from '../appointment/appointment.model.js';
import type { IPatient } from './Patient.js';
import type { IDoctor } from './Doctor.js';

export interface IMedicine {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

export interface IPrescription extends Document {
  appointment: IAppointment['_id'];
  patient: IPatient['_id'];
  doctor: IDoctor['_id'];
  medicines: IMedicine[];
  instructions?: string;
  nextVisitDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MedicineSchema = new Schema({
  name: { type: String, required: true },
  dosage: { type: String, required: true },
  frequency: { type: String, required: true },
  duration: { type: String, required: true }
});

const PrescriptionSchema: Schema = new Schema(
  {
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    medicines: [MedicineSchema],
    instructions: { type: String },
    nextVisitDate: { type: Date }
  },
  { timestamps: true }
);

export const Prescription = mongoose.model<IPrescription>('Prescription', PrescriptionSchema);
