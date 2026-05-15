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
     *     summary: Retrieve clinical departments
     *     parameters:
     *       - in: query
     *         name: page
     *         schema: { type: integer }
     *       - in: query
     *         name: limit
     *         schema: { type: integer }
     *       - in: query
     *         name: search
     *         schema: { type: string }
     *   post:
     *     tags: [Departments]
     *     summary: Create a new department
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [name]
     *             properties:
     *               name: { type: string }
     *               description: { type: string }
     * /api/departments/{id}:
     *   get:
     *     tags: [Departments]
     *     summary: Get department details by ID
     *   put:
     *     tags: [Departments]
     *     summary: Update department details
     *     security:
     *       - bearerAuth: []
     *   delete:
     *     tags: [Departments]
     *     summary: Delete department
     *     security:
     *       - bearerAuth: []
     */
    this.router.get("/", this.departmentController.getDepartments);
    this.router.get("/:id", this.departmentController.getDepartmentById);
    this.router.post("/", authMiddleware, this.departmentController.createDepartment);
    this.router.put("/:id", authMiddleware, this.departmentController.updateDepartment);
    this.router.delete("/:id", authMiddleware, this.departmentController.deleteDepartment);
  }
}
