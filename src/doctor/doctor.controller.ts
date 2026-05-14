import type { Request, Response, NextFunction } from "express";
import { Doctor } from "../models/Doctor.js";

export class DoctorController {
  public async getDoctors(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const doctors = await Doctor.find().populate("user department");
      res.status(200).json({ success: true, count: doctors.length, data: doctors });
    } catch (error) {
      next(error);
    }
  }

  public async getDoctorById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const doctor = await Doctor.findById(req.params.id).populate("user department");
      if (!doctor) {
        res.status(404).json({ success: false, message: "Doctor not found" });
        return;
      }
      res.status(200).json({ success: true, data: doctor });
    } catch (error) {
      next(error);
    }
  }

  public async updateDoctorAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const doctor = await Doctor.findByIdAndUpdate(
        req.params.id, 
        { availability: req.body.availability }, 
        { new: true, runValidators: true }
      );
      res.status(200).json({ success: true, data: doctor });
    } catch (error) {
      next(error);
    }
  }
}
