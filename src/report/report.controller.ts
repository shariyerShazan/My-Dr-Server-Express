import type { Request, Response, NextFunction } from "express";
import { Report } from "../models/Report.js";

export class ReportController {
  public async getReports(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      let query = {};
      if (req.query.patientId) {
        query = { patient: req.query.patientId };
      }
      const reports = await Report.find(query).populate("patient doctor");
      res.status(200).json({ success: true, count: reports.length, data: reports });
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
      res.status(200).json({ success: true, data: report });
    } catch (error) {
      next(error);
    }
  }

  public async createReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const report = await Report.create(req.body);
      res.status(201).json({ success: true, data: report });
    } catch (error) {
      next(error);
    }
  }
}
