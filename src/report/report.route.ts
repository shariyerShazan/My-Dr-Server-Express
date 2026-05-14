import { Router } from "express";
import { ReportController } from "./report.controller.js";
import { authMiddleware } from "../middlewares/auth.js";

export class ReportRoutes {
  public router: Router;
  private reportController: ReportController;

  constructor() {
    this.router = Router();
    this.reportController = new ReportController();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.get("/", authMiddleware, this.reportController.getReports);
    this.router.get("/:id", authMiddleware, this.reportController.getReportById);
    this.router.post("/", authMiddleware, this.reportController.createReport);
  }
}
