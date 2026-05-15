import dotenv from "dotenv";
import type { Application, NextFunction, Request, Response } from "express";
import express from "express";
dotenv.config();
import cors from "cors";

import database from "./config/db.js";
import { AuthRoutes } from "./auth/auth.route.js";
import { UserRoutes } from "./user/user.route.js";
import { AppointmentRoutes } from "./appointment/appointment.route.js";
import { DoctorRoutes } from "./doctor/doctor.route.js";
import { PatientRoutes } from "./patient/patient.route.js";
import { DepartmentRoutes } from "./department/department.route.js";
import { FinanceRoutes } from "./finance/finance.route.js";
import { PrescriptionRoutes } from "./prescription/prescription.route.js";
import { ReportRoutes } from "./report/report.route.js";
import { TelemedicineRoutes } from "./telemedicine/telemedicine.route.js";
import { PaymentRoutes } from "./payment/payment.route.js";
import { NotificationRoutes } from "./notification/notification.route.js";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger.js";
import { createServer, Server as HttpServer } from "http";
import { socketService } from "./config/socket.js";

class App {
  public app: Application;
  public port: number;
  public httpServer: HttpServer;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || "5555", 10);
    this.httpServer = createServer(this.app);

    this.connectDatabase();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
    this.initializeSocket();
  }

  private async connectDatabase(): Promise<void> {
    await database.connect();
  }

  private initializeSocket(): void {
    socketService.initialize(this.httpServer);
  }

  private initializeMiddleware(): void {
    this.app.use(cors(
      {
        origin: process.env.FRONTEND_URL!,
        credentials: true
        }
    ));
    // Global body parsers - Skip for Stripe webhook to allow raw body parsing
    this.app.use((req, res, next) => {
      if (req.originalUrl === "/api/payments/webhook") {
        next();
      } else {
        express.json()(req, res, next);
      }
    });

    this.app.use((req, res, next) => {
      if (req.originalUrl === "/api/payments/webhook") {
        next();
      } else {
        express.urlencoded({ extended: true })(req, res, next);
      }
    });
    
    // Swagger initialization
    this.app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    
    // Serve uploaded reports locally
    this.app.use("/uploads", express.static("uploads"));
  }

  private initializeRoutes(): void {
    const authRoutes = new AuthRoutes();
    const userRoutes = new UserRoutes();
    const appointmentRoutes = new AppointmentRoutes();
    const doctorRoutes = new DoctorRoutes();
    const patientRoutes = new PatientRoutes();
    const departmentRoutes = new DepartmentRoutes();
    const financeRoutes = new FinanceRoutes();
    const prescriptionRoutes = new PrescriptionRoutes();
    const reportRoutes = new ReportRoutes();
    const telemedicineRoutes = new TelemedicineRoutes();
    const paymentRoutes = new PaymentRoutes();
    const notificationRoutes = new NotificationRoutes();
    
    // API Routes
    this.app.use("/api/auth", authRoutes.router);
    this.app.use("/api/users", userRoutes.router);
    this.app.use("/api/appointments", appointmentRoutes.router);
    this.app.use("/api/doctors", doctorRoutes.router);
    this.app.use("/api/patients", patientRoutes.router);
    this.app.use("/api/departments", departmentRoutes.router);
    this.app.use("/api/finances", financeRoutes.router);
    this.app.use("/api/prescriptions", prescriptionRoutes.router);
    this.app.use("/api/reports", reportRoutes.router);
    this.app.use("/api/telemedicine", telemedicineRoutes.router);
    this.app.use("/api/payments", paymentRoutes.router);
    this.app.use("/api/notifications", notificationRoutes.router);

    // Default route
    this.app.get("/", (req: Request, res: Response) => {
      res.send("Welcome to Doctor Dashboard API");
    });
  }

  private initializeErrorHandling(): void {
    this.app.use((err: any, req: Request, res: Response, next: NextFunction) => {
      const status = err.status || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ success: false, status, message });
    });
  }

  public listen(): void {
    this.httpServer.listen(this.port, () => {
      console.log(`🚀 Server listening on port ${this.port}`);
    });
  }
}

const server = new App();
server.listen();
