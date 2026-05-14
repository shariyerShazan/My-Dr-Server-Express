import mongoose, { Schema, Document } from 'mongoose';
import type { IUser } from './User.js';
import type { IDepartment } from './Department.js';


export interface IDoctor extends Document {
  user: IUser['_id'];
  department: IDepartment['_id'];
  firstName: string;
  lastName: string;
  specialization: string;
  experienceYears: number;
  bio?: string;
  contactNumber: string;
  consultationFee: number;
  availability: {
    offDays: string[];
    workingHours: {
      start: string;
      end: string;
    };
    slotDurationMinutes: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const DoctorSchema: Schema = new Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    specialization: { type: String, required: true },
    experienceYears: { type: Number, required: true },
    bio: { type: String },
    contactNumber: { type: String, required: true },
    consultationFee: { type: Number, required: true },
    availability: {
      offDays: [{ type: String }],
      workingHours: {
        start: { type: String, default: '09:00' },
        end: { type: String, default: '17:00' }
      },
      slotDurationMinutes: { type: Number, default: 30 }
    }
  },
  { timestamps: true }
);

export const Doctor = mongoose.model<IDoctor>('Doctor', DoctorSchema);
