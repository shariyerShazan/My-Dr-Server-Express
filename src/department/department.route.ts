import { Router } from "express";
import { DepartmentController } from "./department.controller.js";
import { authMiddleware } from "../middlewares/auth.js";

export class DepartmentRoutes {
  public router: Router;
  private departmentController: DepartmentController;

  constructor() {
    this.router = Router();
    this.departmentController = new DepartmentController();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.get("/", this.departmentController.getDepartments);
    this.router.get("/:id", this.departmentController.getDepartmentById);
    this.router.post("/", authMiddleware, this.departmentController.createDepartment);
  }
}
