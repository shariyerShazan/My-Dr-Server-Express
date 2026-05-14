import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";


export class AuthController {
  
  public async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;

      const user = await User.findOne({ email });
      
      if (!user) {
        res.status(401).json({ success: false, message: "Invalid credentials" });
        return;
      }

      // Check password logic goes here...
      
      const secret = process.env.JWT_SECRET || "fallback_secret";
      
      // Making sure in the token store userId : user._id as requested
      const token = jwt.sign(
        { userId: user._id }, 
        secret, 
        { expiresIn: "1d" }
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
}
