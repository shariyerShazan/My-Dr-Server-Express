import type { Request, Response, NextFunction } from "express";
import { Patient } from "../models/Patient.js";

export class PatientController {
  public async getPatients(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const patients = await Patient.find().populate("user").sort({ createdAt: -1 });
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
      let patient = await Patient.findOne({ user: req.userId } as any).populate("user");
      if (!patient) {
        // Auto-create a default profile if missing (backward compatibility for old users)
        patient = await Patient.create({
          user: req.userId,
          firstName: "Unknown",
          lastName: "Unknown",
          dateOfBirth: new Date(),
          gender: "OTHER",
          contactNumber: "0000000000"
        });
        patient = await patient.populate("user");
      }
      res.status(200).json({ success: true, data: patient });
    } catch (error) {
      next(error);
    }
  }

  public async updatePatient(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      let patientToUpdate;
      // If the URL has an ID param, we update that ID. 
      // This implementation allows "me" or a specific ID.
      if (req.params.id === 'me') {
        patientToUpdate = await Patient.findOne({ user: req.userId });
        if (!patientToUpdate) {
          // Auto-create for backward compatibility if updating
          const newPatientData = {
            user: req.userId,
            firstName: req.body.firstName || "Unknown",
            lastName: req.body.lastName || "Unknown",
            contactNumber: req.body.contactNumber || "0000000000",
            dateOfBirth: req.body.dateOfBirth || new Date(),
            gender: req.body.gender || "OTHER",
            ...req.body
          };
          const newPatient = await Patient.create(newPatientData);
          const populated = await newPatient.populate("user");
          res.status(200).json({ success: true, data: populated });
          return;
        }
      } else {
        patientToUpdate = await Patient.findById(req.params.id);
      }

      if (!patientToUpdate) {
        res.status(404).json({ success: false, message: "Patient profile not found" });
        return;
      }

      // Check authorization
      if (patientToUpdate.user.toString() !== req.userId) {
        res.status(403).json({ success: false, message: "Not authorized to update this profile" });
        return;
      }

      const updatedPatient = await Patient.findByIdAndUpdate(
        patientToUpdate._id,
        { $set: req.body },
        { new: true, runValidators: true }
      ).populate("user");

      res.status(200).json({ success: true, data: updatedPatient });
    } catch (error) {
      next(error);
    }
  }

  public async getDashboardStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      // Identity-Aware: Find ALL patient profiles for this user
      const { Patient } = await import("../models/Patient.js");
      const profiles = await Patient.find({ user: userId });
      if (profiles.length === 0) {
        res.status(200).json({
          success: true,
          data: {
            nextAppointment: null,
            totalAppointments: 0,
            totalPrescriptions: 0,
            totalReports: 0,
            recentAppointments: []
          }
        });
        return;
      }

      const profileIds = profiles.map(p => p._id);
      const { Appointment, AppointmentStatus } = await import("../appointment/appointment.model.js");
      const { Prescription } = await import("../models/Prescription.js");
      const { Report } = await import("../models/Report.js");

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // 1. Next Appointment (from any profile)
      const nextAppointment = await Appointment.findOne({
        patient: { $in: profileIds },
        appointmentDate: { $gte: today },
        status: { $in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] }
      })
        .populate("doctor")
        .sort({ appointmentDate: 1, timeSlot: 1 });

      // 2. Total Counts (across all profiles)
      const totalAppointments = await Appointment.countDocuments({ patient: { $in: profileIds } });
      const totalPrescriptions = await Prescription.countDocuments({ patient: { $in: profileIds } });
      const totalReports = await Report.countDocuments({ patient: { $in: profileIds } });

      // 3. Recent Activity (across all profiles)
      const recentAppointments = await Appointment.find({ patient: { $in: profileIds } })
        .populate("doctor")
        .sort({ appointmentDate: -1 })
        .limit(5);

      res.status(200).json({
        success: true,
        data: {
          nextAppointment,
          totalAppointments,
          totalPrescriptions,
          totalReports,
          recentAppointments
        }
      });
    } catch (error) {
      next(error);
    }
  }
}
