import type { Request, Response, NextFunction } from "express";
import { Report } from "../models/Report.js";
import { Patient } from "../models/Patient.js";
import { Doctor } from "../models/Doctor.js";
import { Appointment } from "../appointment/appointment.model.js";
import { User } from "../models/User.js";
import path from "path";
import fs from "fs";

export class ReportController {
  public async getReports(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      const userId = (req as any).userId;
      if (!userId) {
         res.status(401).json({ success: false, message: "Unauthorized" });
         return;
      }

      const user = await User.findById(userId);
      const role = user?.role;
      
      let query: any = {};
      let targetPatientIds: any[] = [];

      if (role === "PATIENT") {
        // Identity-Aware: Find ALL patient profiles for this user
        const profiles = await Patient.find({ user: userId });
        if (profiles.length === 0) {
          res.status(200).json({ success: true, count: 0, total: 0, data: [] });
          return;
        }
        targetPatientIds = profiles.map(p => p._id);
        query.patient = { $in: targetPatientIds };
      } else if (role === "DOCTOR") {
        const doctor = await Doctor.findOne({ user: userId } as any);
        if (!doctor) {
          res.status(404).json({ success: false, message: "Doctor profile not found" });
          return;
        }

        const patientIdInQuery = req.query.patientId;
        if (!patientIdInQuery) {
          res.status(400).json({ success: false, message: "patientId is required for doctors" });
          return;
        }

        // 1. Resolve the User Identity for the provided patientId
        let targetUserId: string | null = null;
        const pDoc = await Patient.findById(patientIdInQuery).lean();
        if (pDoc) {
          targetUserId = String(pDoc.user);
        } else {
          // Check if it was already a UserID being passed
          const uDoc = await User.findById(patientIdInQuery).lean();
          if (uDoc) targetUserId = String(uDoc._id);
        }

        if (!targetUserId) {
          res.status(404).json({ success: false, message: "Patient identity not found" });
          return;
        }

        // 2. Find ALL patient records for this identity (handles duplicates)
        const allPatientsForUser = await Patient.find({ user: targetUserId }).select("_id").lean();
        targetPatientIds = allPatientsForUser.map(p => p._id);

        // 3. Access Control: Check if Doctor has any appointments with ANY of these patient profiles
        const hasAppointment = await Appointment.exists({
          doctor: doctor._id as any,
          patient: { $in: targetPatientIds }
        } as any);

        if (!hasAppointment) {
          res.status(403).json({ success: false, message: "Access denied. No assigned appointments with this patient." });
          return;
        }

        query.patient = { $in: targetPatientIds };
      }

      const total = await Report.countDocuments(query);
      const reports = await Report.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("patient doctor");

      res.status(200).json({
        success: true,
        count: reports.length,
        total,
        page,
        pages: Math.ceil(total / limit),
        data: reports
      });
    } catch (error) {
      next(error);
    }
  }

  public async getReportById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const report = await Report.findById(req.params.id).populate("patient doctor");
      if (!report) {
         res.status(404).json({ success: false, message: "Report not found" });
         return;
      }

      const userId = (req as any).userId;
      
      // If NOT logged in, we still allow viewing (Public Access)
      // If logged in, we check if they have special reasons to see it (optional, but requested public anyway)
      
      res.status(200).json({ success: true, data: report });
    } catch (error) {
      next(error);
    }
  }

  public async createReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const user = await User.findById(userId);
      const role = user?.role;

      if (role !== "PATIENT") {
        res.status(403).json({ success: false, message: "Only patients can upload reports" });
        return;
      }

      const patient = await Patient.findOne({ user: userId } as any);
      if (!patient) {
        res.status(404).json({ success: false, message: "Patient profile not found" });
        return;
      }

      const { testName, summary } = req.body;
      let fileUrl = "";

      if (req.file) {
        fileUrl = `${process.env.BACKEND_URL}/uploads/docs/${req.file.filename}`;
      } else {
        res.status(400).json({ success: false, message: "File is required" });
        return;
      }

      const report = await Report.create({
        patient: patient._id,
        testName,
        summary,
        fileUrl,
        date: new Date()
      });

      // Identity-Aware: Notify ALL doctors who have appointments with ANY of the patient's profiles
      const allPatientProfiles = await Patient.find({ user: userId }).select("_id").lean();
      const profileIds = allPatientProfiles.map(p => p._id);

      const appointments = await Appointment.find({ patient: { $in: profileIds } }).populate("doctor");
      const doctorUserIds = [...new Set(appointments.map(a => String((a.doctor as any).user)))];
      
      const { socketService } = await import("../config/socket.js");
      doctorUserIds.forEach(id => {
        socketService.createNotification({
          recipient: id,
          title: "New Health Report",
          message: `${patient.firstName} has uploaded a new health report: ${testName}.`,
          type: "REPORT",
          link: `/dashboard/doctor/patients` 
        });
      });

      res.status(201).json({ success: true, data: report });
    } catch (error) {
      next(error);
    }
  }

  public async updateReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const report = await Report.findById(req.params.id);
      if (!report) {
         res.status(404).json({ success: false, message: "Report not found" });
         return;
      }

      const userId = (req as any).userId;
      const reportPatient = await Patient.findById(report.patient).lean();
      
      if (!reportPatient || String(reportPatient.user) !== String(userId)) {
         res.status(403).json({ success: false, message: "Access denied" });
         return;
      }

      if (req.body.testName) report.testName = req.body.testName;
      if (req.body.summary !== undefined) report.summary = req.body.summary;
      
      if (req.file) {
         const oldFileName = report.fileUrl.split("/docs/")[1];
         if (oldFileName) {
           const oldPath = path.join(process.cwd(), "uploads", "docs", oldFileName);
           if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
         }
         report.fileUrl = `${process.env.BACKEND_URL}/uploads/docs/${req.file.filename}`;
      }

      await report.save();
      res.status(200).json({ success: true, data: report });
    } catch (error) {
      next(error);
    }
  }

  public async deleteReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const report = await Report.findById(req.params.id);
      if (!report) {
         res.status(404).json({ success: false, message: "Report not found" });
         return;
      }

      const userId = (req as any).userId;
      const reportPatient = await Patient.findById(report.patient).lean();
      
      if (!reportPatient || String(reportPatient.user) !== String(userId)) {
         res.status(403).json({ success: false, message: "Access denied" });
         return;
      }

      const fileName = report.fileUrl.split("/docs/")[1];
      if (fileName) {
         const filePath = path.join(process.cwd(), "uploads", "docs", fileName);
         if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }

      await Report.findByIdAndDelete(req.params.id);
      res.status(200).json({ success: true, message: "Report deleted successfully" });
    } catch (error) {
       next(error);
    }
  }
}
