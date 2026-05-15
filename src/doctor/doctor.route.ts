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
     *     summary: Retrieve a list of doctors
     *     description: Fetches a paginated list of doctors. Admin/Clinic Admin see all doctors; patients see only Stripe-verified ones.
     *     parameters:
     *       - in: query
     *         name: page
     *         schema:
     *           type: integer
     *       - in: query
     *         name: limit
     *         schema:
     *           type: integer
     *       - in: query
     *         name: search
     *         schema:
     *           type: string
     *       - in: query
     *         name: department
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: List of doctors retrieved successfully
     *   post:
     *     tags: [Doctors]
     *     summary: Create/Invite a new doctor
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [email, firstName, lastName, phone, consultationFee]
     *             properties:
     *               email: { type: string }
     *               firstName: { type: string }
     *               lastName: { type: string }
     *               phone: { type: string }
     *               consultationFee: { type: number }
     *               department: { type: string }
     *               specialization: { type: string }
     * /api/doctors/me:
     *   get:
     *     tags: [Doctors]
     *     summary: Get current authenticated doctor profile
     *     security:
     *       - bearerAuth: []
     *   put:
     *     tags: [Doctors]
     *     summary: Update current authenticated doctor profile
     *     security:
     *       - bearerAuth: []
     * /api/doctors/{id}:
     *   get:
     *     tags: [Doctors]
     *     summary: Get doctor by ID
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *   put:
     *     tags: [Doctors]
     *     summary: Update doctor profile (Admin)
     *     security:
     *       - bearerAuth: []
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
    this.router.get("/dashboard-stats", authMiddleware, this.doctorController.getDashboardStats);
    this.router.get("/my-patients", authMiddleware, this.doctorController.getMyPatients);
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
