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
    /**
     * @openapi
     * /api/appointments:
     *   get:
     *     tags: [Appointments]
     *     summary: Get all appointments
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: List of appointments
     *   post:
     *     tags: [Appointments]
     *     summary: Create an appointment
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       201:
     *         description: Appointment created
     */
    this.router.get("/", authMiddleware, this.appointmentController.getAppointments);
    this.router.post("/", authMiddleware, this.appointmentController.createAppointment);
  }
}
