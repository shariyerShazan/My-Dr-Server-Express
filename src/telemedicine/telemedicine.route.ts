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
    /**
     * @openapi
     * /api/telemedicine:
     *   get:
     *     tags: [Telemedicine]
     *     summary: Get all telemedicine calls
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: query
     *         name: doctorId
     *         schema:
     *           type: string
     *       - in: query
     *         name: patientId
     *         schema:
     *           type: string
     *   post:
     *     tags: [Telemedicine]
     *     summary: Create a telemedicine call
     *     security:
     *       - bearerAuth: []
     */
    this.router.get("/", authMiddleware, this.telemedicineController.getCalls);
    this.router.post("/", authMiddleware, this.telemedicineController.createCall);
  }
}
