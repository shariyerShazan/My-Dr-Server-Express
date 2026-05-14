import { Router } from "express";
import { AppointmentController } from "./appointment.controller.js";
import { authMiddleware } from "../middlewares/auth.js";


export class AppointmentRoutes {
  public router: Router;
  private appointmentController: AppointmentController;

  constructor() {
    this.router = Router();
    this.appointmentController = new AppointmentController();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Applying auth middleware to routes
    this.router.get("/", authMiddleware, this.appointmentController.getAppointments);
    this.router.post("/", authMiddleware, this.appointmentController.createAppointment);
  }
}
