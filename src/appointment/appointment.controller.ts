import type { Request, Response, NextFunction } from "express";
import { Appointment, AppointmentStatus } from "./appointment.model.js";
import { Doctor } from "../models/Doctor.js";
import { Patient } from "../models/Patient.js";
import dayjs from "dayjs";
import { socketService } from "../config/socket.js";

export class AppointmentController {
  
  public async getAppointments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { doctorId, patientId, status, paymentStatus, adminApprovalStatus, date, search, type } = req.query;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      const query: any = {};

      if (doctorId) query.doctor = doctorId;
      if (patientId) query.patient = patientId;
      if (status) query.status = status;
      if (paymentStatus) query.paymentStatus = paymentStatus;
      if (adminApprovalStatus) query.adminApprovalStatus = adminApprovalStatus;
      if (type) query.type = type;
      
      if (date) {
        const startOfDay = dayjs(date as string).startOf('day').toDate();
        const endOfDay = dayjs(date as string).endOf('day').toDate();
        query.appointmentDate = { $gte: startOfDay, $lte: endOfDay };
      }

      if (search) {
         const searchRegex = new RegExp(search as string, "i");
         const Patient = (await import("../models/Patient.js")).Patient;
         const Doctor = (await import("../models/Doctor.js")).Doctor;
         
         const matchingPatients = await Patient.find({ 
            $or: [{ firstName: searchRegex }, { lastName: searchRegex }] 
         }).select('_id');
         const patientIds = matchingPatients.map(p => p._id);

         const matchingDoctors = await Doctor.find({
            $or: [{ firstName: searchRegex }, { lastName: searchRegex }] 
         }).select('_id');
         const doctorIds = matchingDoctors.map(d => d._id);

         // Mongoose ObjectID length is 24 hex characters
         const searchConditions: any[] = [
            { doctor: { $in: doctorIds } },
            { patient: { $in: patientIds } }
         ];

         if (typeof search === "string" && search.length === 24) {
            searchConditions.push({ _id: search });
         }

         query.$or = searchConditions;
      }

      const total = await Appointment.countDocuments(query);
      const appointments = await Appointment.find(query)
        .populate("doctor")
        .populate("patient")
        .populate("department")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      res.status(200).json({ 
        success: true, 
        count: appointments.length, 
        total,
        page,
        pages: Math.ceil(total / limit),
        data: appointments 
      });
    } catch (error) {
      next(error);
    }
  }

  public async updateAdminApprovalStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { adminApprovalStatus } = req.body;

      if (!['APPROVED', 'REJECTED'].includes(adminApprovalStatus)) {
        res.status(400).json({ success: false, message: "Invalid status. Must be APPROVED or REJECTED." });
        return;
      }

      const updateData: any = { adminApprovalStatus };

      const appointment = await Appointment.findByIdAndUpdate(id, updateData, { new: true })
        .populate("patient")
        .populate("doctor");

      if (!appointment) {
        res.status(404).json({ success: false, message: "Appointment not found." });
        return;
      }

      // Notify Patient + Doctor about Admin Approval status
      const patientUserId = (appointment.patient as any).user;
      const doctorUserId = (appointment.doctor as any).user;
      
      if (patientUserId) {
        socketService.createNotification({
          recipient: String(patientUserId),
          title: `Appointment ${adminApprovalStatus}`,
          message: `Your appointment on ${dayjs(appointment.appointmentDate).format("MMM DD")} has been ${adminApprovalStatus.toLowerCase()}.`,
          type: "APPOINTMENT",
          link: "/dashboard/patient/appointments"
        });
      }
      
      if (doctorUserId) {
        socketService.createNotification({
          recipient: String(doctorUserId),
          title: `Admin ${adminApprovalStatus} Appointment`,
          message: `The appointment for ${dayjs(appointment.appointmentDate).format("MMM DD")} was ${adminApprovalStatus.toLowerCase()} by admin.`,
          type: "APPOINTMENT",
          link: "/dashboard/doctor/appointments"
        });
      }

      res.status(200).json({ success: true, data: appointment });
    } catch (error) {
      next(error);
    }
  }

  public async getFinancialSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // All paid appointments
      const paidAppointments = await Appointment.find({ paymentStatus: "PAID" })
        .populate<{ doctor: any }>("doctor")
        .lean();

      // All appointments with pending payment (booked but not yet paid or collected)
      const pendingAppointments = await Appointment.find({ 
        paymentStatus: "PENDING",
        status: { $nin: [AppointmentStatus.CANCELLED] }
      }).populate<{ doctor: any }>("doctor").lean();

      let grossVolume = 0;
      let clinicCommission = 0;

      for (const appt of paidAppointments) {
        const fee = appt.doctor?.consultationFee || 0;
        grossVolume += fee;
        clinicCommission += fee * 0.20;
      }

      let pendingSettlement = 0;
      for (const appt of pendingAppointments) {
        const fee = appt.doctor?.consultationFee || 0;
        pendingSettlement += fee * 0.20;
      }

      res.status(200).json({
        success: true,
        data: {
          grossVolume,
          clinicCommission,
          pendingSettlement,
          totalPaidAppointments: paidAppointments.length,
          totalPendingAppointments: pendingAppointments.length,
        }
      });
    } catch (error) {
      next(error);
    }
  }

  public async getDoctorAppointments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Find doctor from logged-in user
      const doctor = await Doctor.findOne({ user: req.userId } as any);
      if (!doctor) {
        res.status(404).json({ success: false, message: "Doctor profile not found" });
        return;
      }

      const { status, search, type, date } = req.query;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      const query: any = { doctor: doctor._id };

      if (status && status !== "ALL") query.status = status;
      if (type) query.type = type;

      if (date === "today") {
        query.appointmentDate = {
          $gte: dayjs().startOf("day").toDate(),
          $lte: dayjs().endOf("day").toDate(),
        };
      } else if (date === "upcoming") {
        query.appointmentDate = { $gte: dayjs().startOf("day").toDate() };
      } else if (date && date !== "all") {
        query.appointmentDate = {
          $gte: dayjs(date as string).startOf("day").toDate(),
          $lte: dayjs(date as string).endOf("day").toDate(),
        };
      }

      if (search) {
        const searchRegex = new RegExp(search as string, "i");
        const { Patient } = await import("../models/Patient.js");
        const matchingPatients = await Patient.find({
          $or: [{ firstName: searchRegex }, { lastName: searchRegex }],
        }).select("_id");
        const patientIds = matchingPatients.map((p) => p._id);
        query.patient = { $in: patientIds };
      }

      const total = await Appointment.countDocuments(query);
      const appointments = await Appointment.find(query)
        .populate("patient")
        .populate("doctor")
        .populate("department")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      res.status(200).json({
        success: true,
        count: appointments.length,
        total,
        page,
        pages: Math.ceil(total / limit),
        data: appointments,
      });
    } catch (error) {
      next(error);
    }
  }

  public async createAppointment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { doctorId, patientId, appointmentDate, timeSlot, type, symptoms, notes } = req.body;

      // 0. Resolve Patient if not provided
      let finalPatientId = patientId;
      if (!finalPatientId && req.userId) {
        const patient = await Patient.findOne({ user: req.userId } as any);
        if (patient) finalPatientId = patient._id;
      }

      if (!finalPatientId) {
        res.status(400).json({ success: false, message: "Patient profile not found. Please complete your profile first." });
        return;
      }

      // 1. Get Doctor Data
      const doctor = await Doctor.findById(doctorId);
      if (!doctor) {
        res.status(404).json({ success: false, message: "Doctor not found" });
        return;
      }

      const targetDate = dayjs(appointmentDate);
      const dayOfWeek = targetDate.format('dddd');

      // 2. Check for Specific Off Days (Practice Closures)
      const dateStr = targetDate.format('YYYY-MM-DD');
      if (doctor.availability.offDays && doctor.availability.offDays.includes(dateStr)) {
        res.status(400).json({ success: false, message: `The doctor is on holiday on ${dateStr}` });
        return;
      }

      // 3. Check Weekly Operational Hours
      const scheduleForDay = doctor.availability.weeklySchedule.find(s => s.day === dayOfWeek);
      if (!scheduleForDay || !scheduleForDay.isActive) {
        res.status(400).json({ success: false, message: `Doctor does not consult on ${dayOfWeek}s` });
        return;
      }

      // 4. Validate Time Slot is within Working Hours
      // Comparing strings like "09:00" <= "10:00" <= "17:00" works for 24h format
      if (timeSlot < scheduleForDay.startTime || timeSlot > scheduleForDay.endTime) {
        res.status(400).json({ 
          success: false, 
          message: `Appointment time ${timeSlot} is outside working hours (${scheduleForDay.startTime} - ${scheduleForDay.endTime})` 
        });
        return;
      }

      // 5. Check for Existing Appointments (Collision)
      const startOfTarget = targetDate.startOf('day').toDate();
      const endOfTarget = targetDate.endOf('day').toDate();

      const existingAppointment = await Appointment.findOne({
        doctor: doctorId,
        appointmentDate: { $gte: startOfTarget, $lte: endOfTarget },
        timeSlot: timeSlot,
        status: { $ne: AppointmentStatus.CANCELLED }
      });

      if (existingAppointment) {
        res.status(400).json({ success: false, message: "This time slot is already booked by another patient." });
        return;
      }

      // 6. Create Appointment
      const appointmentData: any = {
        doctor: doctorId,
        patient: finalPatientId,
        department: doctor.department,
        appointmentDate: startOfTarget, // Store as date
        timeSlot,
        type,
        symptoms,
        notes,
        status: AppointmentStatus.PENDING,
        adminApprovalStatus: "APPROVED"
      };

      // Generate meet link immediately for Telemedicine
      if (type === "TELEMEDICINE") {
        const roomId = `${String(finalPatientId).slice(-4)}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
        appointmentData.meetLink = `https://meet.jit.si/mydr-${roomId}`;
      }

      const appointment = await Appointment.create(appointmentData);

      // Notify Doctor + Admin about New Appointment
      const doctorUser = await Doctor.findById(doctorId).populate("user").lean();
      if (doctorUser && (doctorUser as any).user) {
        socketService.createNotification({
          recipient: String((doctorUser as any).user._id),
          title: "New Appointment Booked",
          message: `You have a new appointment for ${dayjs(appointmentDate).format("MMM DD")} at ${timeSlot}.`,
          type: "APPOINTMENT",
          link: "/dashboard/doctor/appointments"
        });
      }
      socketService.createNotificationForRole("CLINIC_ADMIN", {
        title: "New Appointment Booked",
        message: `A new appointment has been booked for Dr. ${doctor.firstName}.`,
        type: "APPOINTMENT",
        link: "/clinic/appointments"
      });

      res.status(201).json({ success: true, data: appointment });
    } catch (error) {
      next(error);
    }
  }
}
