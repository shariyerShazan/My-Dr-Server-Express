import type { Request, Response, NextFunction } from "express";
import { Prescription } from "../models/Prescription.js";

export class PrescriptionController {
  public async getPrescriptions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      let query = {};
      if (req.query.patientId) {
        query = { patient: req.query.patientId as any };
      }
      const prescriptions = await Prescription.find(query).populate("doctor patient appointment").sort({ createdAt: -1 });
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
      const doctor = await (await import("../models/Doctor.js")).Doctor.findOne({ user: req.userId } as any);
      if (!doctor) {
        res.status(404).json({ success: false, message: "Doctor profile not found" });
        return;
      }

      let fileUrl = "";
      if (req.file) {
        fileUrl = `${process.env.BACKEND_URL}/uploads/docs/${req.file.filename}`;
      }

      const prescription = await Prescription.create({
        ...req.body,
        doctor: doctor._id,
        fileUrl
      });

      // Notify Patient
      const { Patient } = await import("../models/Patient.js");
      const patient = await Patient.findById(req.body.patient).populate("user");
      if (patient && (patient as any).user) {
        const { socketService } = await import("../config/socket.js");
        socketService.createNotification({
          recipient: String((patient as any).user._id),
          title: "New Prescription Received",
          message: `Dr. ${doctor.firstName} has issued a new prescription for you.`,
          type: "PRESCRIPTION",
          link: "/dashboard/patient/prescription"
        });
      }

      res.status(201).json({ success: true, data: prescription });
    } catch (error) {
      next(error);
    }
  }

  public async getPatientPrescriptions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { patientId } = req.params;
      const prescriptions = await Prescription.find({ patient: patientId as any })
        .populate("doctor", "firstName lastName specialization")
        .sort({ createdAt: -1 });
      
      res.status(200).json({ success: true, count: prescriptions.length, data: prescriptions });
    } catch (error) {
      next(error);
    }
  }
}
