import type { Request, Response, NextFunction } from "express";
import { Patient } from "../models/Patient.js";

export class PatientController {
  public async getPatients(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const patients = await Patient.find().populate("user");
      res.status(200).json({ success: true, count: patients.length, data: patients });
    } catch (error) {
      next(error);
    }
  }

  public async getPatientById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const patient = await Patient.findById(req.params.id).populate("user");
      if (!patient) {
        res.status(404).json({ success: false, message: "Patient not found" });
        return;
      }
      res.status(200).json({ success: true, data: patient });
    } catch (error) {
      next(error);
    }
  }

  public async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }
      const patient = await Patient.findOne({ user: req.userId } as any).populate("user");
      if (!patient) {
        res.status(404).json({ success: false, message: "Patient profile not found" });
        return;
      }
      res.status(200).json({ success: true, data: patient });
    } catch (error) {
      next(error);
    }
  }
}
