import { Router } from "express";
import { FinanceController } from "./finance.controller.js";
import { authMiddleware } from "../middlewares/auth.js";

export class FinanceRoutes {
  public router: Router;
  private financeController: FinanceController;

  constructor() {
    this.router = Router();
    this.financeController = new FinanceController();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    /**
     * @openapi
     * /api/finances:
     *   get:
     *     tags: [Finances]
     *     summary: Get all transactional records
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: query
     *         name: doctorId
     *         schema: { type: string }
     * /api/finances/analytics:
     *   get:
     *     tags: [Finances]
     *     summary: Get clinic aggregation analytics (Transactions, Commissions, Active Staff)
     *     security:
     *       - bearerAuth: []
     * /api/finances/my-earnings:
     *   get:
     *     tags: [Finances]
     *     summary: Get doctor's total earnings and payout history
     *     security:
     *       - bearerAuth: []
     */
    this.router.get("/", authMiddleware, this.financeController.getFinances);
    this.router.get("/analytics", authMiddleware, this.financeController.getClinicAnalytics);
    this.router.get("/my-earnings", authMiddleware, this.financeController.getMyEarnings);
  }
}
