import type { Request, Response, NextFunction } from "express";
import Stripe from "stripe";
import {
  Appointment,
  AppointmentStatus,
} from "../appointment/appointment.model.js";
import { Doctor } from "../models/Doctor.js";
import { Finance, PaymentStatus } from "../models/Finance.js";
import dayjs from "dayjs";

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
  public async createStripeAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const doctor = await Doctor.findOne({ user: req.userId } as any).populate("user");
      if (!doctor) {
        res.status(404).json({ success: false, message: "Doctor profile not found" });
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

      let accountId = doctor.stripeAccountId;

      if (!accountId) {
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
      doctor.stripeId = accountId;
      await doctor.save();

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

  public async getStripeStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const doctor = await Doctor.findOne({ user: req.userId } as any).populate("user");
      if (!doctor) {
        res.status(404).json({ success: false, message: "Doctor profile not found" });
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
          isPublic: doctor.isStripeAccountVerified,
          firstName: doctor.firstName,
          lastName: doctor.lastName,
          consultationFee: doctor.consultationFee,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  public async getStripeDashboardLink(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const doctor = await Doctor.findOne({ user: req.userId } as any);
      if (!doctor || !doctor.stripeAccountId) {
        res.status(400).json({ success: false, message: "Stripe account not found" });
        return;
      }

      const loginLink = await getStripe().accounts.createLoginLink(doctor.stripeAccountId);
      res.status(200).json({ success: true, url: loginLink.url });
    } catch (error) {
      next(error);
    }
  }

  public async createCheckoutSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Expect full appointment payload rather than an ID
      const { doctorId, patientId, appointmentDate, timeSlot, type, symptoms, notes } = req.body;

      if (!doctorId || !patientId || !appointmentDate || !timeSlot) {
        res.status(400).json({ success: false, message: "Missing required booking details." });
        return;
      }

      const doctor = await Doctor.findById(doctorId);
      if (!doctor) {
        res.status(404).json({ success: false, message: "Doctor not found" });
        return;
      }

      if (!doctor.isStripeConnected || !doctor.stripeAccountId) {
        res.status(400).json({ success: false, message: "Doctor has not enabled payments yet." });
        return;
      }

      // Perform availability validation (similar to appointment creation logic)
      const targetDate = dayjs(appointmentDate);
      const dayOfWeek = targetDate.format('dddd');

      const dateStr = targetDate.format('YYYY-MM-DD');
      if (doctor.availability.offDays && doctor.availability.offDays.includes(dateStr)) {
        res.status(400).json({ success: false, message: `The doctor is on holiday on ${dateStr}` });
        return;
      }

      const scheduleForDay = doctor.availability.weeklySchedule.find(s => s.day === dayOfWeek);
      if (!scheduleForDay || !scheduleForDay.isActive) {
        res.status(400).json({ success: false, message: `Doctor does not consult on ${dayOfWeek}s` });
        return;
      }

      if (timeSlot < scheduleForDay.startTime || timeSlot > scheduleForDay.endTime) {
        res.status(400).json({ success: false, message: `Appointment time ${timeSlot} is outside working hours` });
        return;
      }

      const startOfTarget = targetDate.startOf('day').toDate();
      const endOfTarget = targetDate.endOf('day').toDate();
      const existingAppointment = await Appointment.findOne({
        doctor: doctorId,
        appointmentDate: { $gte: startOfTarget, $lte: endOfTarget },
        timeSlot: timeSlot,
        status: { $ne: AppointmentStatus.CANCELLED }
      });

      if (existingAppointment) {
        res.status(400).json({ success: false, message: "This time slot is already booked." });
        return;
      }

      // Minimum charge validation for Stripe ($0.50 USD)
      if (doctor.consultationFee < 0.5) {
        res.status(400).json({
          success: false,
          message: `Consultation fee ($${doctor.consultationFee}) is too low for online payment. Please set it to at least $0.50.`
        });
        return;
      }

      // Create checkout session using metadata to store future appointment data
      const amount = doctor.consultationFee * 100;
      const applicationFee = Math.round(amount * 0.2);

      const session = await getStripe().checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `Consultation with Dr. ${doctor.firstName} ${doctor.lastName}`,
                description: `Appointment on ${dateStr} at ${timeSlot}`,
              },
              unit_amount: amount,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${process.env.FRONTEND_URL}/dashboard/patient/appointments?status=paid&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/dashboard/patient/appointments?status=cancelled`,
        metadata: {
          doctorId,
          patientId,
          appointmentDate: startOfTarget.toISOString(),
          timeSlot,
          type: type || "IN_PERSON",
          symptoms: symptoms ? symptoms.substring(0, 450) : "",
          notes: notes ? notes.substring(0, 450) : "",
          isWebhookCreated: "true"
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

  public async stripeWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
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
        const metadata = session.metadata || {};

        if (metadata.isWebhookCreated === "true") {
          // Fresh appointment booked exclusively via Stripe Session!
          const doctor = await Doctor.findById(metadata.doctorId);

          if (doctor) {
            const appointmentData: any = {
              doctor: metadata.doctorId as string,
              patient: metadata.patientId as string,
              department: String(doctor.department),
              appointmentDate: new Date(metadata.appointmentDate as string),
              timeSlot: metadata.timeSlot as string,
              type: metadata.type as any,
              symptoms: metadata.symptoms as string,
              notes: metadata.notes as string,
              status: AppointmentStatus.CONFIRMED,
              paymentStatus: "PAID"
            };

            if (metadata.type === "TELEMEDICINE") {
              const roomId = `${String(metadata.patientId).slice(-4)}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
              appointmentData.meetLink = `https://meet.jit.si/mydr-${roomId}`;
            }

            const appointment = await Appointment.create(appointmentData);

            // Create Finance Record
            await Finance.create({
              doctor: metadata.doctorId as string,
              patient: metadata.patientId as string,
              appointment: appointment._id as any,
              amount: session.amount_total! / 100,
              status: PaymentStatus.PAID,
              transactionId: session.id, // Or payment_intent
              paymentDate: new Date()
            });

            // Notify Admin & Doctor via Socket
            try {
              const { socketService } = await import("../config/socket.js");
              const populatedDoctor = await Doctor.findById(metadata.doctorId).populate("user");
              if (populatedDoctor && (populatedDoctor as any).user) {
                socketService.createNotification({
                  recipient: String((populatedDoctor as any).user._id),
                  title: "New Paid Appointment",
                  message: `A new appointment has been booked and paid for ${dayjs(metadata.appointmentDate).format("MMM DD")}.`,
                  type: "APPOINTMENT",
                  link: "/dashboard/doctor/appointments"
                });
              }
              socketService.createNotificationForRole("CLINIC_ADMIN", {
                title: "New Revenue Generated",
                message: `New booking for Dr. ${doctor.firstName}. Payment verified.`,
                type: "FINANCE",
                link: "/clinic/finance"
              });
            } catch (e) {
              console.error("Socket emit failed", e);
            }

            console.log(`✅ Appointment and Finance successfully pure-created via Stripe Webhook.`);
          } else {
            console.log(`❌ Pure Webhook booking failed: Doctor not found.`);
          }
        }
        else if (metadata.appointmentId) {
          // Backward compatibility for old flow
          await Appointment.findByIdAndUpdate(metadata.appointmentId, {
            status: AppointmentStatus.CONFIRMED,
            paymentStatus: "PAID",
          });
          console.log(`✅ Legacy Appointment ${metadata.appointmentId} confirmed via Stripe.`);
        }
      }

      if (event.type === "account.updated") {
        const account = event.data.object as Stripe.Account;
        const isReady = account.details_submitted &&
          (account.charges_enabled ||
            account.capabilities?.transfers === "active" ||
            account.payouts_enabled);

        if (isReady) {
          await Doctor.findOneAndUpdate(
            { stripeAccountId: account.id },
            { isStripeConnected: true, isStripeAccountVerified: true, stripeOnboardingComplete: true },
          );

          // Notify Admin about Doctor Verification
          try {
            const dr = await Doctor.findOne({ stripeAccountId: account.id });
            const { socketService } = await import("../config/socket.js");
            socketService.createNotificationForRole("CLINIC_ADMIN", {
              title: "Doctor Stripe Verified",
              message: `Dr. ${dr?.firstName} ${dr?.lastName} has completed Stripe onboarding and is now verified.`,
              type: "DOCTOR_VERIFICATION",
              link: "/clinic/doctors"
            });
          } catch (e) { }

        } else if (account.details_submitted) {
          await Doctor.findOneAndUpdate(
            { stripeAccountId: account.id },
            { stripeOnboardingComplete: true, isStripeConnected: false, isStripeAccountVerified: false },
          );
        } else {
          await Doctor.findOneAndUpdate(
            { stripeAccountId: account.id },
            { isStripeConnected: false, isStripeAccountVerified: false, stripeOnboardingComplete: false },
          );
        }
      }

      res.json({ received: true });
    } catch (error) {
      console.error("Error processing webhook:", error);
      next(error);
    }
  }
}
