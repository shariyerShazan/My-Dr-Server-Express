import { Router } from "express";
import { AuthController } from "./auth.controller.js";


export class AuthRoutes {
  public router: Router;
  private authController: AuthController;

  constructor() {
    this.router = Router();
    this.authController = new AuthController();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    /**
     * @openapi
     * /api/auth/login:
     *   post:
     *     tags: [Auth]
     *     summary: Login user and get token
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               email:
     *                 type: string
     *               password:
     *                 type: string
     *     responses:
     *       200:
     *         description: Login successful
     *       401:
     *         description: Invalid credentials
     */
    this.router.post("/login", this.authController.login);
    
    /**
     * @openapi
     * /api/auth/register/send-otp:
     *   post:
     *     tags: [Auth]
     *     summary: Send OTP for registration
     * /api/auth/register/verify-otp:
     *   post:
     *     tags: [Auth]
     *     summary: Verify OTP and create user
     */
    this.router.post("/register/send-otp", this.authController.sendOtp);
    this.router.post("/register/verify-otp", this.authController.verifyOtpAndRegister);
  }
}
