import type { Request, Response, NextFunction } from "express";
import { Telemedicine } from "../models/Telemedicine.js";

export class TelemedicineController {
  public async getCalls(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      let query = {};
      if (req.query.doctorId) {
        query = { doctor: req.query.doctorId };
      } else if (req.query.patientId) {
        query = { patient: req.query.patientId };
      }
      
      const calls = await Telemedicine.find(query).populate("doctor patient appointment");
      res.status(200).json({ success: true, count: calls.length, data: calls });
    } catch (error) {
      next(error);
    }
  }

  public async createCall(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const call = await Telemedicine.create(req.body);
      res.status(201).json({ success: true, data: call });
    } catch (error) {
      next(error);
    }
  }
}
