import type { Request, Response, NextFunction } from "express";
import Stripe from "stripe";
import {
  Appointment,
  AppointmentStatus,
} from "../appointment/appointment.model.js";
import { Doctor } from "../models/Doctor.js";

let stripe: Stripe;

const getStripe = () => {
  if (!stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    stripe = new Stripe(key, {
      apiVersion: "2025-01-27.acacia" as any,
    });
  }
  return stripe;
};

export class PaymentController {
  public async createStripeAccount(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const doctor = await Doctor.findOne({ user: req.userId } as any).populate(
        "user",
      );
      if (!doctor) {
        res
          .status(404)
          .json({ success: false, message: "Doctor profile not found" });
        return;
      }

      const user = doctor.user as any;

      if (doctor.stripeAccountId && doctor.isStripeAccountVerified) {
        res.status(200).json({
          success: true,
          message: "Stripe already connected and verified",
          stripeAccountId: doctor.stripeAccountId,
          isVerified: true,
        });
        return;
      }

      // If account exists but not verified, get the onboarding link again
      let accountId = doctor.stripeAccountId;

      if (!accountId) {
        // 1. Create Express Account
        const account = await getStripe().accounts.create({
          type: "express",
          country: "BD",
          email: user.email,
          capabilities: {
            transfers: { requested: true },
          },
          tos_acceptance: {
            service_agreement: "recipient",
          },
        });
        accountId = account.id;
      }

      doctor.stripeAccountId = accountId;
      doctor.stripeId = accountId; // Store both for consistency
      await doctor.save();

      // 2. Create Onboarding Link
      const accountLink = await getStripe().accountLinks.create({
        account: accountId,
        refresh_url: `${process.env.FRONTEND_URL}/dashboard/doctor/availability?stripe=refresh`,
        return_url: `${process.env.FRONTEND_URL}/dashboard/doctor/availability?stripe=success`,
        type: "account_onboarding",
      });

      res.status(200).json({
        success: true,
        url: accountLink.url,
        message: "Complete your Stripe setup to start receiving payments",
      });
    } catch (error) {
      next(error);
    }
  }

  public async getStripeStatus(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const doctor = await Doctor.findOne({ user: req.userId } as any).populate(
        "user",
      );
      if (!doctor) {
        res
          .status(404)
          .json({ success: false, message: "Doctor profile not found" });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          stripeId: doctor.stripeId,
          stripeAccountId: doctor.stripeAccountId,
          isStripeConnected: doctor.isStripeConnected,
          isStripeAccountVerified: doctor.isStripeAccountVerified,
          stripeOnboardingComplete: doctor.stripeOnboardingComplete,
          isPublic: doctor.isStripeAccountVerified, // Doctor is public when verified
          firstName: doctor.firstName,
          lastName: doctor.lastName,
          consultationFee: doctor.consultationFee,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  public async getStripeDashboardLink(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const doctor = await Doctor.findOne({ user: req.userId } as any);
      if (!doctor || !doctor.stripeAccountId) {
        res
          .status(400)
          .json({ success: false, message: "Stripe account not found" });
        return;
      }

      const loginLink = await getStripe().accounts.createLoginLink(
        doctor.stripeAccountId,
      );
      res.status(200).json({ success: true, url: loginLink.url });
    } catch (error) {
      next(error);
    }
  }

  public async createCheckoutSession(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { appointmentId } = req.body;
      const appointment =
        await Appointment.findById(appointmentId).populate("doctor");

      if (!appointment) {
        res
          .status(404)
          .json({ success: false, message: "Appointment not found" });
        return;
      }

      const doctor = appointment.doctor as any;
      if (!doctor.isStripeConnected || !doctor.stripeAccountId) {
        res
          .status(400)
          .json({
            success: false,
            message: "Doctor has not enabled payments yet.",
          });
        return;
      }

      const amount = doctor.consultationFee * 100; // in cents
      const applicationFee = Math.round(amount * 0.2); // 20% commission

      const session = await getStripe().checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `Consultation with Dr. ${doctor.firstName} ${doctor.lastName}`,
                description: `Appointment on ${appointment.appointmentDate} at ${appointment.timeSlot}`,
              },
              unit_amount: amount,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${process.env.FRONTEND_URL}/patient/appointments?status=paid&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/patient/appointments?status=cancelled`,
        metadata: {
          appointmentId: appointment.id,
        },
        payment_intent_data: {
          application_fee_amount: applicationFee,
          transfer_data: {
            destination: doctor.stripeAccountId,
          },
        },
      });

      res.status(200).json({ success: true, url: session.url });
    } catch (error) {
      next(error);
    }
  }

  public async stripeWebhook(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const sig = req.headers["stripe-signature"] as string;
    let event: Stripe.Event;

    try {
      event = getStripe().webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET as string,
      );
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    try {
      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        const appointmentId = session.metadata?.appointmentId;

        if (appointmentId) {
          await Appointment.findByIdAndUpdate(appointmentId, {
            status: AppointmentStatus.CONFIRMED,
            paymentStatus: "PAID",
          });
          console.log(`✅ Appointment ${appointmentId} confirmed via Stripe.`);
        }
      }

      if (event.type === "account.updated") {
        const account = event.data.object as Stripe.Account;

        // Check if onboarding is complete and charges or transfers are enabled
        // For BD accounts, charges_enabled will be false, so we check transfers capability or payouts_enabled
        const isReady = account.details_submitted && 
          (account.charges_enabled || 
           account.capabilities?.transfers === "active" || 
           account.payouts_enabled);

        if (isReady) {
          const updatedDoctor = await Doctor.findOneAndUpdate(
            { stripeAccountId: account.id },
            {
              isStripeConnected: true,
              isStripeAccountVerified: true,
              stripeOnboardingComplete: true,
            },
            { new: true },
          );
          console.log(
            `✅ Doctor account ${account.id} is now LIVE, CONNECTED and VERIFIED.`,
          );
          console.log(
            `   Doctor: ${updatedDoctor?.firstName} ${updatedDoctor?.lastName} is now PUBLIC!`,
          );
        } else if (account.details_submitted) {
          // Onboarding submitted but charges not enabled yet
          await Doctor.findOneAndUpdate(
            { stripeAccountId: account.id },
            {
              stripeOnboardingComplete: true,
              isStripeConnected: false,
              isStripeAccountVerified: false,
            },
          );
          console.log(
            `⏳ Doctor account ${account.id} onboarding submitted, awaiting verification.`,
          );
        } else {
          // Onboarding not complete
          await Doctor.findOneAndUpdate(
            { stripeAccountId: account.id },
            {
              isStripeConnected: false,
              isStripeAccountVerified: false,
              stripeOnboardingComplete: false,
            },
          );
          console.log(
            `⚠️  Doctor account ${account.id} onboarding incomplete.`,
          );
        }
      }

      if (event.type === "account.application.authorized") {
        const account = event.data.object as unknown as Stripe.Account;
        console.log(`✓ Application authorized for account ${account.id}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error("Error processing webhook:", error);
      next(error);
    }
  }
}
