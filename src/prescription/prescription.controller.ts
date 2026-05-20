import type { Request, Response, NextFunction } from "express";
import { Prescription } from "../models/Prescription.js";

export class PrescriptionController {
  public async getPrescriptions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      let query: any = {};
      
      const role = (req as any).role;
      const userId = (req as any).userId;
      
      // If user is a patient, only show their own prescriptions (aggregate all profiles)
      if (role === "PATIENT") {
        const { Patient } = await import("../models/Patient.js");
        const patients = await Patient.find({ user: userId as any });
        if (patients.length > 0) {
          query.patient = { $in: patients.map(p => p._id) };
        } else {
          // If no patient document for this user, return empty list
          res.status(200).json({ success: true, count: 0, data: [] });
          return;
        }
      } else if (req.query.patientId) {
        // Apply the same logic for query param
        const { Patient } = await import("../models/Patient.js");
        const { User } = await import("../models/User.js");
        
        let targetUserId: string | null = null;
        const pDoc = await Patient.findById(req.query.patientId).lean();
        if (pDoc) {
          targetUserId = String(pDoc.user);
        } else {
          const uDoc = await User.findById(req.query.patientId).lean();
          if (uDoc) targetUserId = String(uDoc._id);
        }

        if (targetUserId) {
          const allPs = await Patient.find({ user: targetUserId }).select("_id").lean();
          query.patient = { $in: allPs.map(p => p._id) };
        } else {
          query.patient = req.query.patientId;
        }
      }

      const prescriptions = await Prescription.find(query)
        .populate("doctor", "firstName lastName specialization")
        .populate("patient", "firstName lastName")
        .sort({ createdAt: -1 });

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
      const { doctor: bodyDoctorId, patient: patientId } = req.body;
      let finalDoctorId = bodyDoctorId;

      // If its NOT providing a doctorId in body, we try to find it from current user (if they are a doctor)
      if (!finalDoctorId) {
        const doctor = await (await import("../models/Doctor.js")).Doctor.findOne({ user: req.userId } as any);
        if (doctor) {
          finalDoctorId = doctor._id;
        }
      }

      if (!finalDoctorId) {
        res.status(400).json({ success: false, message: "Doctor ID is required to create a prescription." });
        return;
      }

      let fileUrl = "";
      if (req.file) {
        fileUrl = `${process.env.BACKEND_URL}/uploads/docs/${req.file.filename}`;
      }

      const prescription = await Prescription.create({
        ...req.body,
        doctor: finalDoctorId,
        fileUrl
      });

      // Notify Patient
      const { Patient } = await import("../models/Patient.js");
      const patient = await Patient.findById(patientId).populate("user").lean();
      
      if (patient && (patient as any).user) {
        const doctorData = await (await import("../models/Doctor.js")).Doctor.findById(finalDoctorId).lean();
        const { socketService } = await import("../config/socket.js");
        
        socketService.createNotification({
          recipient: String((patient as any).user._id),
          title: "New Prescription Received",
          message: `Dr. ${doctorData?.firstName || "Doctor"} has issued a new prescription for you.`,
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
      console.log(`[DEBUG] Fetching prescriptions for ID: ${patientId}`);
      
      const { Patient } = await import("../models/Patient.js");
      const { User } = await import("../models/User.js");

      let userId: string | null = null;

      // 1. Check if the provided ID is a Patient ID
      const patientDoc = await Patient.findById(patientId).lean();
      if (patientDoc) {
        userId = String(patientDoc.user);
        console.log(`[DEBUG] Resolved as Patient ID. Associated User ID: ${userId}`);
      } else {
        // 2. Check if the provided ID is a User ID
        const userDoc = await User.findById(patientId).lean();
        if (userDoc) {
          userId = String(userDoc._id);
          console.log(`[DEBUG] Resolved as User ID: ${userId}`);
        }
      }

      let query: any = {};
      
      if (userId) {
        // 3. Find ALL patient records for this user (handles duplicates)
        const allPatientsForUser = await Patient.find({ user: userId }).select("_id").lean();
        const patientIds = allPatientsForUser.map(p => p._id);
        query.patient = { $in: patientIds };
        console.log(`[DEBUG] Found ${patientIds.length} patient profiles for user ${userId}: ${patientIds}`);
      } else {
        console.log(`[DEBUG] ID ${patientId} not found in Patient or User records. Using literal search.`);
        query.patient = patientId;
      }

      const prescriptions = await Prescription.find(query)
        .populate("doctor", "firstName lastName specialization")
        .populate("patient", "firstName lastName")
        .sort({ createdAt: -1 });
      
      console.log(`[DEBUG] Returning ${prescriptions.length} prescriptions for query ${JSON.stringify(query)}`);
      res.status(200).json({ success: true, count: prescriptions.length, data: prescriptions });
    } catch (error) {
      console.error(`[ERROR] getPatientPrescriptions failed:`, error);
      next(error);
    }
  }
}
