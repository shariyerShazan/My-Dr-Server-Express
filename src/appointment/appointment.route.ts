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
     *     summary: Get paginated appointments
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: query
     *         name: status
     *         schema: { type: string }
     *       - in: query
     *         name: date
     *         schema: { type: string }
     *   post:
     *     tags: [Appointments]
     *     summary: Book a new appointment
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [doctorId, appointmentDate, timeSlot, type]
     *             properties:
     *               doctorId: { type: string }
     *               patientId: { type: string }
     *               appointmentDate: { type: string }
     *               timeSlot: { type: string }
     *               type: { type: string, enum: [CLINIC, TELEMEDICINE] }
     * /api/appointments/me:
     *   get:
     *     tags: [Appointments]
     *     summary: Get doctor's own appointments
     *     security:
     *       - bearerAuth: []
     * /api/appointments/financial-summary:
     *   get:
     *     tags: [Appointments]
     *     summary: Get clinic total gross and pending settlement
     *     security:
     *       - bearerAuth: []
     * /api/appointments/{id}/admin-approval:
     *   patch:
     *     tags: [Appointments]
     *     summary: Admin approve/reject appointment (generates meet link)
     *     security:
     *       - bearerAuth: []
     */
    this.router.get("/", authMiddleware, this.appointmentController.getAppointments);
    this.router.get("/financial-summary", authMiddleware, this.appointmentController.getFinancialSummary);
    this.router.get("/my-appointments", authMiddleware, this.appointmentController.getDoctorAppointments);
    this.router.post("/", authMiddleware, this.appointmentController.createAppointment);
    this.router.patch("/:id/admin-approval", authMiddleware, this.appointmentController.updateAdminApprovalStatus);
  }
}
