import { Router } from "express";
import { DoctorController } from "./doctor.controller.js";
import { authMiddleware } from "../middlewares/auth.js";

export class DoctorRoutes {
  public router: Router;
  private doctorController: DoctorController;

  constructor() {
    this.router = Router();
    this.doctorController = new DoctorController();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.get("/", this.doctorController.getDoctors);
    this.router.get("/:id", this.doctorController.getDoctorById);
    this.router.put("/:id/availability", authMiddleware, this.doctorController.updateDoctorAvailability);
  }
}
