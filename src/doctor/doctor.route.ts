import { Router } from "express";
import { DoctorController } from "./doctor.controller.js";
import { authMiddleware } from "../middlewares/auth.js";

export class DoctorRoutes {
  public router: Router;
  private doctorController: DoctorController;

  constructor() {
    this.router = Router();
    this.doctorController = new DoctorController();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    /**
     * @openapi
     * /api/doctors:
     *   get:
     *     tags: [Doctors]
     *     summary: Get all doctors
     *     responses:
     *       200:
     *         description: List of doctors
     *   post:
     *     tags: [Doctors]
     *     summary: Create a new doctor
     *     security:
     *       - bearerAuth: []
     * /api/doctors/{id}:
     *   get:
     *     tags: [Doctors]
     *     summary: Get a doctor by ID
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *   delete:
     *     tags: [Doctors]
     *     summary: Delete a doctor
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     * /api/doctors/{id}/suspend:
     *   put:
     *     tags: [Doctors]
     *     summary: Toggle doctor suspension status
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     * /api/doctors/{id}/availability:
     *   put:
     *     tags: [Doctors]
     *     summary: Update doctor availability
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     */
    this.router.get("/me", authMiddleware, this.doctorController.getMe);
    this.router.put("/me", authMiddleware, this.doctorController.updateMe);
    this.router.get("/", authMiddleware, this.doctorController.getDoctors);
    this.router.post("/", authMiddleware, this.doctorController.createDoctor);
    this.router.get("/:id", authMiddleware, this.doctorController.getDoctorById);
    this.router.put("/:id", authMiddleware, this.doctorController.updateDoctor);
    this.router.delete("/:id", authMiddleware, this.doctorController.deleteDoctor);
    this.router.put("/:id/suspend", authMiddleware, this.doctorController.suspendDoctor);
    this.router.put("/:id/availability", authMiddleware, this.doctorController.updateDoctorAvailability);
  }
}
