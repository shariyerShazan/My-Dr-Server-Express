import type { Request, Response, NextFunction } from "express";
import { Finance } from "../models/Finance.js";

export class FinanceController {
  public async getFinances(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      let query = {};
      
      // If doctorId is provided, filter by doctor
      if (req.query.doctorId) {
        query = { doctor: req.query.doctorId };
      }

      const finances = await Finance.find(query).populate("doctor patient appointment");
      res.status(200).json({ success: true, count: finances.length, data: finances });
    } catch (error) {
      next(error);
    }
  }
}
