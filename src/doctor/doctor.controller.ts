import type { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { Doctor } from "../models/Doctor.js";
import { User, UserRole } from "../models/User.js";
import { sendMail } from "../utils/mailSender.js";

export class DoctorController {
  public async getDoctors(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      // Get user role to determine which doctors to show
      const currentUser = await User.findById(req.userId);
      const isAdmin =
        currentUser?.role === UserRole.ADMIN ||
        currentUser?.role === UserRole.CLINIC_ADMIN;

      // Admin sees ALL doctors, Patients see only verified doctors
      let query: any = isAdmin ? {} : { isStripeAccountVerified: true };

      if (req.query.search) {
        const regex = new RegExp(req.query.search as string, "i");

        // Find users matching search for email search
        const users = await User.find({ email: regex });
        const userIds = users.map((u) => u._id);

        query.$or = [
          { firstName: regex },
          { lastName: regex },
          { specialization: regex },
          { contactNumber: regex },
          { user: { $in: userIds } },
        ];
      }

      if (req.query.department) {
        query.department = req.query.department;
      }

      const total = await Doctor.countDocuments(query);
      const doctors = await Doctor.find(query)
        .populate("user")
        .populate("department")
        .skip(skip)
        .limit(limit);

      res.status(200).json({
        success: true,
        data: doctors,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          isAdmin,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  public async getDoctorById(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const doctor = await Doctor.findById(req.params.id)
        .populate("user")
        .populate("department");
      if (!doctor) {
        res.status(404).json({ success: false, message: "Doctor not found" });
        return;
      }
      res.status(200).json({ success: true, data: doctor });
    } catch (error) {
      next(error);
    }
  }

  public async getMe(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.userId) {
        res
          .status(401)
          .json({ success: false, message: "Unauthorized: No user ID" });
        return;
      }
      const doctor = await Doctor.findOne({ user: req.userId } as any)
        .populate("user")
        .populate("department");
      if (!doctor) {
        res
          .status(404)
          .json({ success: false, message: "Doctor profile not found" });
        return;
      }
      res.status(200).json({ success: true, data: doctor });
    } catch (error) {
      next(error);
    }
  }

  public async createDoctor(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const {
        email,
        firstName,
        lastName,
        phone,
        consultationFee,
        department,
        specialization,
        qualifications,
      } = req.body;

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        res
          .status(400)
          .json({ success: false, message: "Email already in use" });
        return;
      }

      // Auto-generate password
      const rawPassword = Math.random().toString(36).slice(-8);
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(rawPassword, salt);

      // Create User
      const user = await User.create({
        email,
        passwordHash,
        role: UserRole.DOCTOR,
        isActive: true,
      });

      // Department logic - if string provided, try to find or create
      let deptId = null;
      if (department) {
        // Assume mongoose ObjectId validation will fail if it's a string name
        const { Department } = await import("../models/Department.js");
        let existingDept = await Department.findOne({
          name: { $regex: new RegExp("^" + department + "$", "i") },
        });
        if (!existingDept) {
          existingDept = await Department.create({ name: department });
        }
        deptId = existingDept._id;
      }

      // Create Doctor with initial Stripe fields
      // Splitting Name if passed full name, or just mapping directly
      const doctorData: any = {
        user: user._id,
        firstName: firstName || "",
        lastName: lastName || "",
        contactNumber: phone,
        consultationFee: consultationFee,
        specialization: specialization || "",
        experienceYears: 0,
        bio: qualifications || "",
        availability: {
          offDays: [],
          workingHours: { start: "09:00", end: "17:00" },
          slotDurationMinutes: 30,
        },
        // Initialize Stripe fields
        stripeId: null,
        stripeAccountId: null,
        isStripeConnected: false,
        isStripeAccountVerified: false,
        stripeOnboardingComplete: false,
      };

      if (deptId) {
        doctorData.department = deptId;
      }

      const doctor = await Doctor.create(doctorData);

      // Send Email with Password and Stripe setup instructions
      const emailHtml = `
      <h3>Welcome to the Clinic!</h3>
      <p>Hello Dr. ${firstName} ${lastName},</p>
      <p>Your account has been successfully created. You can log in using the following credentials:</p>
      <ul>
        <li><b>Email</b>: ${email}</li>
        <li><b>Password</b>: ${rawPassword}</li>
      </ul>
      <p><strong>Next Step: Set up Stripe Payment</strong></p>
      <p>To start receiving payments from appointments, you need to complete your Stripe Express setup:</p>
      <ol>
        <li>Log in to your account</li>
        <li>Go to your Doctor Profile → Availability</li>
        <li>Click "Connect Stripe" button</li>
        <li>Complete the Stripe Express onboarding</li>
        <li>Once verified, you'll be visible to patients on the platform</li>
      </ol>
      <p>We recommend changing your password after your first login.</p>
      `;

      await sendMail(email, "Your Doctor Account Credentials", emailHtml);

      res.status(201).json({ success: true, data: doctor });
    } catch (error) {
      next(error);
    }
  }

  public async suspendDoctor(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const doctor = await Doctor.findById(req.params.id);
      if (!doctor) {
        res.status(404).json({ success: false, message: "Doctor not found" });
        return;
      }
      // Toggle User active state
      const user = await User.findById(doctor.user);
      if (user) {
        user.isActive = !user.isActive;
        await user.save();
      }
      res.status(200).json({
        success: true,
        message: "Doctor active status toggled",
        isActive: user?.isActive,
      });
    } catch (error) {
      next(error);
    }
  }

  public async deleteDoctor(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const doctor = await Doctor.findById(req.params.id);
      if (!doctor) {
        res.status(404).json({ success: false, message: "Doctor not found" });
        return;
      }
      await User.findByIdAndDelete(doctor.user);

      // Cleanup: Unset this doctor from any department head position
      const { Department } = await import("../models/Department.js");
      await Department.updateMany(
        { headDoctor: req.params.id },
        { $unset: { headDoctor: "" } },
      );

      await Doctor.findByIdAndDelete(req.params.id);
      res.status(200).json({ success: true, message: "Doctor deleted" });
    } catch (error) {
      next(error);
    }
  }

  public async updateDoctor(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const {
        email,
        firstName,
        lastName,
        phone,
        consultationFee,
        department,
        specialization,
        qualifications,
      } = req.body;

      const doctor = await Doctor.findById(req.params.id);
      if (!doctor) {
        res.status(404).json({ success: false, message: "Doctor not found" });
        return;
      }

      // Update User email if changed
      if (doctor.user && email) {
        await User.findByIdAndUpdate(doctor.user, { email });
      }

      // Handle department string to ID
      let deptId = doctor.department;
      if (department) {
        const { Department } = await import("../models/Department.js");
        let existingDept = await Department.findOne({
          name: { $regex: new RegExp("^" + department + "$", "i") },
        });
        if (!existingDept) {
          existingDept = await Department.create({ name: department });
        }
        deptId = existingDept._id;
      }

      const updatedDoctor = await Doctor.findByIdAndUpdate(
        req.params.id,
        {
          firstName,
          lastName,
          contactNumber: phone,
          consultationFee,
          department: deptId,
          specialization,
          bio: qualifications,
        },
        { new: true },
      );

      res.status(200).json({ success: true, data: updatedDoctor });
    } catch (error) {
      next(error);
    }
  }

  public async updateDoctorAvailability(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const doctor = await Doctor.findByIdAndUpdate(
        req.params.id,
        { availability: req.body.availability },
        { new: true, runValidators: true },
      );
      res.status(200).json({ success: true, data: doctor });
    } catch (error) {
      next(error);
    }
  }

  public async updateMe(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const {
        firstName,
        lastName,
        contactNumber,
        consultationFee,
        specialization,
        bio,
        experienceYears,
      } = req.body;

      const doctor = await Doctor.findOneAndUpdate(
        { user: req.userId } as any,
        {
          firstName,
          lastName,
          contactNumber,
          consultationFee,
          specialization,
          bio,
          experienceYears,
        },
        { new: true, runValidators: true },
      );

      if (!doctor) {
        res
          .status(404)
          .json({ success: false, message: "Doctor profile not found" });
        return;
      }

      res.status(200).json({ success: true, data: doctor });
    } catch (error) {
      next(error);
    }
  }
}
