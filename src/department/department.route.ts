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
    /**
     * @openapi
     * /api/departments:
     *   get:
     *     tags: [Departments]
     *     summary: Get all departments
     *   post:
     *     tags: [Departments]
     *     summary: Create a department
     *     security:
     *       - bearerAuth: []
     * /api/departments/{id}:
     *   get:
     *     tags: [Departments]
     *     summary: Get a department by ID
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     */
    this.router.get("/", this.departmentController.getDepartments);
    this.router.get("/:id", this.departmentController.getDepartmentById);
    this.router.post("/", authMiddleware, this.departmentController.createDepartment);
    this.router.put("/:id", authMiddleware, this.departmentController.updateDepartment);
    this.router.delete("/:id", authMiddleware, this.departmentController.deleteDepartment);
  }
}
