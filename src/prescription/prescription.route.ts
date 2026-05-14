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
    this.router.get("/", authMiddleware, this.prescriptionController.getPrescriptions);
    this.router.get("/:id", authMiddleware, this.prescriptionController.getPrescriptionById);
    this.router.post("/", authMiddleware, this.prescriptionController.createPrescription);
  }
}
