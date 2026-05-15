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

      let patientIdFilter = req.query.patientId;
      const userId = (req as any).userId;

      if (!userId) {
         res.status(401).json({ success: false, message: "Unauthorized" });
         return;
      }

      const user = await User.findById(userId);
      const role = user?.role;

      if (role === "PATIENT") {
        const patient = await Patient.findOne({ user: userId } as any);
        if (!patient) {
          res.status(404).json({ success: false, message: "Patient profile not found" });
          return;
        }
        patientIdFilter = patient._id as unknown as string;
      } else if (role === "DOCTOR") {
        const doctor = await Doctor.findOne({ user: userId } as any);
        if (!doctor) {
          res.status(404).json({ success: false, message: "Doctor profile not found" });
          return;
        }
        
        if (!patientIdFilter) {
          res.status(400).json({ success: false, message: "patientId is required for doctors" });
          return;
        }

        // Access Control: Check if Doctor has any appointments with this Patient
        const hasAppointment = await Appointment.exists({
          doctor: doctor._id as any,
          patient: patientIdFilter as any
        } as any);

        if (!hasAppointment) {
          res.status(403).json({ success: false, message: "Access denied. No assigned appointments with this patient." });
          return;
        }
      }

      const query: any = {};
      if (patientIdFilter) {
        query.patient = patientIdFilter;
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
      const report = await Report.findById(req.params.id);
      if (!report) {
         res.status(404).json({ success: false, message: "Report not found" });
         return;
      }

      const userId = (req as any).userId;
      const user = await User.findById(userId);
      const role = user?.role;

      if (role === "PATIENT") {
        const patient = await Patient.findOne({ user: userId } as any);
        if (String(report.patient) !== String(patient?._id)) {
           res.status(403).json({ success: false, message: "Access denied" });
           return;
        }
      } else if (role === "DOCTOR") {
        const doctor = await Doctor.findOne({ user: userId } as any);
        const hasAppointment = await Appointment.exists({
          doctor: doctor?._id as any,
          patient: report.patient as any
        } as any);
        if (!hasAppointment) {
           res.status(403).json({ success: false, message: "Access denied" });
           return;
        }
      }

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

      // Notify doctors who have appointments with this patient
      const appointments = await Appointment.find({ patient: patient._id }).populate("doctor");
      const doctorUserIds = [...new Set(appointments.map(a => String((a.doctor as any).user)))];
      
      const { socketService } = await import("../config/socket.js");
      doctorUserIds.forEach(id => {
        socketService.createNotification({
          recipient: id,
          title: "New Health Report",
          message: `${patient.firstName} has uploaded a new health report: ${testName}.`,
          type: "REPORT",
          link: `/dashboard/doctor/patients` // Or a more specific link if available
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
      const patient = await Patient.findOne({ user: userId } as any);
      if (String(report.patient) !== String(patient?._id)) {
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
      const patient = await Patient.findOne({ user: userId } as any);
      if (String(report.patient) !== String(patient?._id)) {
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
