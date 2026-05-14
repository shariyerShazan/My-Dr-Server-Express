import { Router } from "express";
import { PrescriptionController } from "./prescription.controller.js";
import { authMiddleware } from "../middlewares/auth.js";

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
     *     summary: Get all prescriptions
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: query
     *         name: patientId
     *         schema:
     *           type: string
     *         description: Filter by patient ID
     *   post:
     *     tags: [Prescriptions]
     *     summary: Create a prescription
     *     security:
     *       - bearerAuth: []
     * /api/prescriptions/{id}:
     *   get:
     *     tags: [Prescriptions]
     *     summary: Get a prescription by ID
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     */
    this.router.get("/", authMiddleware, this.prescriptionController.getPrescriptions);
    this.router.get("/:id", authMiddleware, this.prescriptionController.getPrescriptionById);
    this.router.post("/", authMiddleware, this.prescriptionController.createPrescription);
  }
}
