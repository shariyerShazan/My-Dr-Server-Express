import { Router } from "express";
import { PrescriptionController } from "./prescription.controller.js";
import { authMiddleware } from "../middlewares/auth.js";
import { upload } from "../middlewares/upload.js";

export class PrescriptionRoutes {
  public router: Router;
  private prescriptionController: PrescriptionController;

  constructor() {
    this.router = Router();
    this.prescriptionController = new PrescriptionController();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    /**
     * @openapi
     * /api/prescriptions:
     *   get:
     *     tags: [Prescriptions]
     *     summary: Retrieve prescriptions
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: query
     *         name: patientId
     *         schema: { type: string }
     *   post:
     *     tags: [Prescriptions]
     *     summary: Issue a new prescription
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       content:
     *         multipart/form-data:
     *           schema:
     *             type: object
     *             properties:
     *               patient: { type: string }
     *               appointment: { type: string }
     *               title: { type: string }
     *               description: { type: string }
     *               file: { type: string, format: binary }
     * /api/prescriptions/patient/{patientId}:
     *   get:
     *     tags: [Prescriptions]
     *     summary: Get all prescriptions for a specific patient
     *     security:
     *       - bearerAuth: []
     * /api/prescriptions/{id}:
     *   get:
     *     tags: [Prescriptions]
     *     summary: Get prescription details by ID
     *     security:
     *       - bearerAuth: []
     */
    this.router.get("/", authMiddleware, this.prescriptionController.getPrescriptions);
    this.router.get("/patient/:patientId", authMiddleware, this.prescriptionController.getPatientPrescriptions);
    this.router.get("/:id", this.prescriptionController.getPrescriptionById);
    this.router.post("/", authMiddleware, upload.single("file"), this.prescriptionController.createPrescription);
  }
}
