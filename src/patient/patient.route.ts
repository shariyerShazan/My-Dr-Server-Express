import { Router } from "express";
import { PatientController } from "./patient.controller.js";
import { authMiddleware } from "../middlewares/auth.js";

export class PatientRoutes {
  public router: Router;
  private patientController: PatientController;

  constructor() {
    this.router = Router();
    this.patientController = new PatientController();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    /**
     * @openapi
     * /api/patients:
     *   get:
     *     tags: [Patients]
     *     summary: Get all patients (Admin)
     *     security:
     *       - bearerAuth: []
     * /api/patients/me:
     *   get:
     *     tags: [Patients]
     *     summary: Get self profile
     *     security:
     *       - bearerAuth: []
     *   put:
     *     tags: [Patients]
     *     summary: Update self profile
     *     security:
     *       - bearerAuth: []
     * /api/patients/me/dashboard-stats:
     *   get:
     *     tags: [Patients]
     *     summary: Get stats for patient dashboard
     *     security:
     *       - bearerAuth: []
     * /api/patients/{id}:
     *   get:
     *     tags: [Patients]
     *     summary: Get a patient by ID
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     */
    this.router.get("/me", authMiddleware, this.patientController.getMe);
    this.router.get("/dashboard-stats", authMiddleware, this.patientController.getDashboardStats);
    this.router.get("/", authMiddleware, this.patientController.getPatients);
    this.router.get("/:id", authMiddleware, this.patientController.getPatientById);
    this.router.patch("/:id", authMiddleware, this.patientController.updatePatient);
  }
}
