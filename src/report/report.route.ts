import { Router } from "express";
import { ReportController } from "./report.controller.js";
import { authMiddleware } from "../middlewares/auth.js";
import { upload } from "../middlewares/upload.js";

export class ReportRoutes {
  public router: Router;
  private reportController: ReportController;

  constructor() {
    this.router = Router();
    this.reportController = new ReportController();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    /**
     * @openapi
     * /api/reports:
     *   get:
     *     tags: [Reports]
     *     summary: Get all reports
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: query
     *         name: patientId
     *         schema:
     *           type: string
     *         description: Filter by patient ID
     *   post:
     *     tags: [Reports]
     *     summary: Create a report
     *     security:
     *       - bearerAuth: []
     * /api/reports/{id}:
     *   get:
     *     tags: [Reports]
     *     summary: Get a report by ID
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     */
    this.router.get("/", authMiddleware, this.reportController.getReports);
    this.router.get("/:id", authMiddleware, this.reportController.getReportById);
    this.router.post("/", authMiddleware, upload.single("file"), this.reportController.createReport);
    this.router.patch("/:id", authMiddleware, upload.single("file"), this.reportController.updateReport);
    this.router.delete("/:id", authMiddleware, this.reportController.deleteReport);
  }
}
