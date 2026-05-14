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

class App {
  public app: Application;
  public port: number;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || "5000", 10);

    this.connectDatabase();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private async connectDatabase(): Promise<void> {
    await database.connect();
  }

  private initializeMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
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
    this.app.listen(this.port, () => {
      console.log(`🚀 Server listening on port ${this.port}`);
    });
  }
}

const server = new App();
server.listen();
