import type { Request, Response, NextFunction } from "express";
import { Prescription } from "../models/Prescription.js";

export class PrescriptionController {
  public async getPrescriptions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      let query = {};
      if (req.query.patientId) {
        query = { patient: req.query.patientId };
      }
      const prescriptions = await Prescription.find(query).populate("doctor patient appointment");
      res.status(200).json({ success: true, count: prescriptions.length, data: prescriptions });
    } catch (error) {
      next(error);
    }
  }

  public async getPrescriptionById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const prescription = await Prescription.findById(req.params.id).populate("doctor patient appointment");
      if (!prescription) {
        res.status(404).json({ success: false, message: "Prescription not found" });
        return;
      }
      res.status(200).json({ success: true, data: prescription });
    } catch (error) {
      next(error);
    }
  }

  public async createPrescription(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const prescription = await Prescription.create(req.body);
      res.status(201).json({ success: true, data: prescription });
    } catch (error) {
      next(error);
    }
  }
}
