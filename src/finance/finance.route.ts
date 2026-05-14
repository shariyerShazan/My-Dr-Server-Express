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
    this.router.get("/", authMiddleware, this.financeController.getFinances);
  }
}
