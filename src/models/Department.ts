import mongoose, { Schema, Document } from "mongoose";

export interface IDepartment extends Document {
  name: string;
  description?: string;
  icon?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DepartmentSchema: Schema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String },
    icon: { type: String },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

DepartmentSchema.virtual("doctorCount", {
  ref: "Doctor",
  localField: "_id",
  foreignField: "department",
  count: true,
});

DepartmentSchema.virtual("doctors", {
  ref: "Doctor",
  localField: "_id",
  foreignField: "department",
});

export const Department = mongoose.model<IDepartment>(
  "Department",
  DepartmentSchema,
);
