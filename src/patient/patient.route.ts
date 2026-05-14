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
    this.router.get("/", authMiddleware, this.patientController.getPatients);
    this.router.get("/:id", authMiddleware, this.patientController.getPatientById);
  }
}
