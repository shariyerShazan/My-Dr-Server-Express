import { Router } from "express";
import { PaymentController } from "./payment.controller.js";
import { authMiddleware } from "../middlewares/auth.js";
import express from "express";

export class PaymentRoutes {
  public router: Router;
  private paymentController: PaymentController;

  constructor() {
    this.router = Router();
    this.paymentController = new PaymentController();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // 1. Webhook MUST use raw body for signature verification
    this.router.post(
      "/webhook",
      express.raw({ type: "application/json" }),
      (req, res, next) => this.paymentController.stripeWebhook(req, res, next),
    );

    // 2. Doctor Stripe Actions (require auth and JSON body)
    this.router.post(
      "/create-account",
      authMiddleware,
      this.paymentController.createStripeAccount,
    );
    this.router.get(
      "/stripe-status",
      authMiddleware,
      this.paymentController.getStripeStatus,
    );
    this.router.get(
      "/dashboard-link",
      authMiddleware,
      this.paymentController.getStripeDashboardLink,
    );

    // 3. Checkout
    this.router.post(
      "/create-checkout-session",
      authMiddleware,
      this.paymentController.createCheckoutSession,
    );
  }
}
