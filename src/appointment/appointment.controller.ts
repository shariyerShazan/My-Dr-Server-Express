import type { Request, Response, NextFunction } from "express";


export class AppointmentController {
  
  public async getAppointments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({ message: "getAppointments stub" });
    } catch (error) {
      next(error);
    }
  }

  public async createAppointment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(201).json({ message: "createAppointment stub" });
    } catch (error) {
      next(error);
    }
  }
}
