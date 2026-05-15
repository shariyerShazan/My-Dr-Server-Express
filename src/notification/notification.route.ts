import { Router } from "express";
import { NotificationController } from "./notification.controller.js";
import { authMiddleware } from "../middlewares/auth.js";

export class NotificationRoutes {
  public router: Router;
  private controller: NotificationController;

  constructor() {
    this.router = Router();
    this.controller = new NotificationController();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.get("/", authMiddleware, this.controller.getMyNotifications);
    this.router.patch("/:id/read", authMiddleware, this.controller.markAsRead);
    this.router.patch("/read-all", authMiddleware, this.controller.markAllAsRead);
  }
}
