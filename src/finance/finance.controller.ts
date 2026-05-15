import type { Request, Response, NextFunction } from "express";
import { Finance, PaymentStatus } from "../models/Finance.js";

export class FinanceController {
  public async getFinances(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      let query = {};
      
      // If doctorId is provided, filter by doctor
      if (req.query.doctorId) {
        query = { doctor: req.query.doctorId };
      }

      const finances = await Finance.find(query).populate("doctor patient appointment").sort({ createdAt: -1 });
      res.status(200).json({ success: true, count: finances.length, data: finances });
    } catch (error) {
      next(error);
    }
  }

  public async getClinicAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { Appointment } = await import("../appointment/appointment.model.js");
      const { Doctor } = await import("../models/Doctor.js");
      const { Department } = await import("../models/Department.js");

      // 1. Total Transactions & Net Commission
      const finances = await Finance.find({ status: PaymentStatus.PAID });
      const totalTransactions = finances.reduce((acc, f) => acc + f.amount, 0);
      const netCommission = totalTransactions * 0.20; // Assuming 20% platform commission

      // 2. Active Doctors
      const activeDoctors = await Doctor.countDocuments({ isStripeAccountVerified: true });

      // 3. Patient Bookings (Total)
      const totalBookings = await Appointment.countDocuments();

      // 4. Appointment Growth (Last 7 days)
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - i);
        const dayEnd = new Date(d);
        dayEnd.setDate(dayEnd.getDate() + 1);

        const count = await Appointment.countDocuments({
          appointmentDate: { $gte: d, $lt: dayEnd }
        });
        
        last7Days.push({
          name: d.toLocaleDateString("en-US", { weekday: "short" }),
          appointments: count
        });
      }

      // 5. Top Departments
      // Aggregate appointments by department
      const deptStats = await Appointment.aggregate([
        { $group: { _id: "$department", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 4 }
      ]);

      const populatedDeptStats = await Promise.all(deptStats.map(async (stat) => {
        const dept = await Department.findById(stat._id);
        return {
          label: dept?.name || "Unknown",
          value: stat.count
        };
      }));

      // Calculate percentage for departments relative to total bookings
      const topDepartments = populatedDeptStats.map(d => ({
        ...d,
        percentage: totalBookings > 0 ? Math.round((d.value / totalBookings) * 100) : 0
      }));

      res.status(200).json({
        success: true,
        data: {
          totalTransactions,
          netCommission,
          activeDoctors,
          totalBookings,
          growthData: last7Days,
          topDepartments
        }
      });
    } catch (error) {
      next(error);
    }
  }

  public async getMyEarnings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { Doctor } = await import("../models/Doctor.js");
      const doctor = await Doctor.findOne({ user: req.userId } as any);
      if (!doctor) {
        res.status(404).json({ success: false, message: "Doctor profile not found" });
        return;
      }

      const finances = await Finance.find({ doctor: doctor._id })
        .populate("patient", "firstName lastName contactNumber")
        .populate("appointment", "appointmentDate timeSlot status")
        .sort({ createdAt: -1 });

      const totalEarnings = finances
        .filter(f => f.status === PaymentStatus.PAID)
        .reduce((acc, f) => acc + f.amount, 0);

      res.status(200).json({
        success: true,
        data: {
          totalEarnings,
          history: finances
        }
      });
    } catch (error) {
      next(error);
    }
  }
}
