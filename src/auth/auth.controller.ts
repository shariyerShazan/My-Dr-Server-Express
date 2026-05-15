import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { User, UserRole } from "../models/User.js";
import { Otp } from "../models/Otp.js";
import { Patient } from "../models/Patient.js";
import { sendMail } from "../utils/mailSender.js";

export class AuthController {
  
  public async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;

      const user = await User.findOne({ email });
      
      if (!user) {
        res.status(401).json({ success: false, message: "Invalid credentials" });
        return;
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
         res.status(401).json({ success: false, message: "Invalid credentials" });
         return;
      }
      
      if (!user.isActive) {
         res.status(403).json({ success: false, message: "Account is suspended" });
         return;
      }
      
      const secret = process.env.JWT_SECRET || "fallback_secret";
      
      const token = jwt.sign(
        { userId: user._id }, 
        secret, 
        { expiresIn: "7d" }
      );

      res.status(200).json({
        success: true,
        token,
        user: {
          _id: user._id,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      next(error);
    }
  }

  public async sendOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        res.status(400).json({ success: false, message: "Email is already registered. Please login." });
        return;
      }

      // Generate 6-digit OTP
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Expire in 10 minutes
      const expiresAt = new Date(Date.now() + 10 * 60000);
      
      // Map to DB
      await Otp.findOneAndUpdate(
         { email },
         { otp: generatedOtp, expiresAt },
         { upsert: true, new: true }
      );

      const html = `
        <h3>Your Registration Security Code</h3>
        <p>Your one-time password (OTP) to securely register on the platform is:</p>
        <h2 style="color: #0EA5E9; letter-spacing: 2px;">${generatedOtp}</h2>
        <p>This code will expire in 10 minutes. Do not share this code.</p>
      `;

      await sendMail(email, "Your Registration OTP Code", html);

      res.status(200).json({ success: true, message: "OTP sent successfully to email" });
    } catch (error) {
      next(error);
    }
  }

  public async verifyOtpAndRegister(req: Request, res: Response, next: NextFunction): Promise<void> {
     try {
       const { email, otp, password, firstName, lastName, dateOfBirth, contactNumber, gender, address, bloodGroup } = req.body;
       
       const otpRecord = await Otp.findOne({ email });
       if (!otpRecord) {
         res.status(400).json({ success: false, message: "OTP not found or expired. Request a new one." });
         return;
       }

       if (otpRecord.otp !== otp) {
         res.status(400).json({ success: false, message: "Invalid OTP code." });
         return;
       }

       if (new Date() > otpRecord.expiresAt) {
         res.status(400).json({ success: false, message: "OTP has expired." });
         return;
       }

       // Delete the OTP as it's been successfully verified
       await Otp.findByIdAndDelete(otpRecord._id);

       const salt = await bcrypt.genSalt(10);
       const passwordHash = await bcrypt.hash(password, salt);

       const user = await User.create({
         email,
         passwordHash,
         role: UserRole.PATIENT, // default role for self-service registration
         isActive: true
       });

       // Create default patient profile
       await Patient.create({
         user: user._id,
         firstName: firstName || "Unknown",
         lastName: lastName || "Unknown",
         dateOfBirth: dateOfBirth || new Date(),
         gender: gender || "OTHER",
         contactNumber: contactNumber || "0000000000",
         address: address || "",
         bloodGroup: bloodGroup || ""
       });

      const secret = process.env.JWT_SECRET || "fallback_secret";
      const token = jwt.sign(
        { userId: user._id }, 
        secret, 
        { expiresIn: "7d" }
      );

       res.status(201).json({
         success: true,
         message: "Registration successful",
         token,
         user: {
           _id: user._id,
           email: user.email,
           role: user.role
         }
       });

       // Notify Admin
       try {
         const { socketService } = await import("../config/socket.js");
         socketService.createNotificationForRole("CLINIC_ADMIN", {
           title: "New Patient Registered",
           message: `${firstName} ${lastName} has joined the platform.`,
           type: "USER_REGISTRATION",
           link: "/clinic/overview" // Or relevant admin page
         });
       } catch (e) {
         console.error("Socket notification failed", e);
       }
     } catch (error) {
        next(error);
     }
  }
}
