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
     *     summary: Get all patients
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
    this.router.get("/", authMiddleware, this.patientController.getPatients);
    this.router.get("/:id", authMiddleware, this.patientController.getPatientById);
  }
}
