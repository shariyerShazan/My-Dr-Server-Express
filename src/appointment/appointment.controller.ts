import type { Request, Response, NextFunction } from "express";
import { Appointment, AppointmentStatus } from "./appointment.model.js";
import { Doctor } from "../models/Doctor.js";
import { Patient } from "../models/Patient.js";
import dayjs from "dayjs";

export class AppointmentController {
  
  public async getAppointments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { doctorId, patientId, status, date } = req.query;
      const query: any = {};

      if (doctorId) query.doctor = doctorId;
      if (patientId) query.patient = patientId;
      if (status) query.status = status;
      if (date) {
        const startOfDay = dayjs(date as string).startOf('day').toDate();
        const endOfDay = dayjs(date as string).endOf('day').toDate();
        query.appointmentDate = { $gte: startOfDay, $lte: endOfDay };
      }

      const appointments = await Appointment.find(query)
        .populate("doctor")
        .populate("patient")
        .populate("department")
        .sort({ appointmentDate: 1, timeSlot: 1 });

      res.status(200).json({ success: true, count: appointments.length, data: appointments });
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
      const appointment = await Appointment.create({
        doctor: doctorId,
        patient: finalPatientId,
        department: doctor.department,
        appointmentDate: startOfTarget, // Store as date
        timeSlot,
        type,
        symptoms,
        notes,
        status: AppointmentStatus.PENDING
      });

      res.status(201).json({ success: true, data: appointment });
    } catch (error) {
      next(error);
    }
  }
}
