import mongoose, { Schema, Document } from 'mongoose';
import type { IUser } from './User.js';


export interface IPatient extends Document {
  user: IUser['_id'];
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  bloodGroup: string;
  contactNumber: string;
  address: string;
  emergencyContact: string;
  medicalHistory: string[];
  createdAt: Date;
  updatedAt: Date;
}

const PatientSchema: Schema = new Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    dateOfBirth: { type: Date, required: true },
    gender: { type: String, enum: ['MALE', 'FEMALE', 'OTHER'], required: true },
    bloodGroup: { type: String },
    contactNumber: { type: String, required: true },
    address: { type: String },
    emergencyContact: { type: String },
    medicalHistory: [{ type: String }]
  },
  { timestamps: true }
);

export const Patient = mongoose.model<IPatient>('Patient', PatientSchema);
