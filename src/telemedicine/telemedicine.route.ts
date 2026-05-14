import { Router } from "express";
import { TelemedicineController } from "./telemedicine.controller.js";
import { authMiddleware } from "../middlewares/auth.js";

export class TelemedicineRoutes {
  public router: Router;
  private telemedicineController: TelemedicineController;

  constructor() {
    this.router = Router();
    this.telemedicineController = new TelemedicineController();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.get("/", authMiddleware, this.telemedicineController.getCalls);
    this.router.post("/", authMiddleware, this.telemedicineController.createCall);
  }
}
