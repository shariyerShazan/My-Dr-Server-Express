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
     *             required: [email, password]
     *             properties:
     *               email: { type: string }
     *               password: { type: string }
     * /api/auth/register/send-otp:
     *   post:
     *     tags: [Auth]
     *     summary: Send OTP for registration
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [email]
     *             properties:
     *               email: { type: string }
     * /api/auth/register/verify-otp:
     *   post:
     *     tags: [Auth]
     *     summary: Verify OTP and create user account
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [email, otp, password]
     *             properties:
     *               email: { type: string }
     *               otp: { type: string }
     *               password: { type: string }
     */
    this.router.post("/login", this.authController.login);
    this.router.post("/register/send-otp", this.authController.sendOtp);
    this.router.post("/register/verify-otp", this.authController.verifyOtpAndRegister);
  }
}
