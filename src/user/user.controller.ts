import type { Request, Response, NextFunction } from "express";
import { User } from "../models/User.js";

export class UserController {
  public async getUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await User.find().select("-passwordHash");
      res.status(200).json({ success: true, count: users.length, data: users });
    } catch (error) {
      next(error);
    }
  }

  public async getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await User.findById(req.params.id).select("-passwordHash");
      if (!user) {
        res.status(404).json({ success: false, message: "User not found" });
        return;
      }
      res.status(200).json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  public async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await User.findById(req.userId).select("-passwordHash");
      res.status(200).json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  public async createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await User.create(req.body);
      res.status(201).json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  public async updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).select("-passwordHash");
      res.status(200).json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  public async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await User.findByIdAndDelete(req.params.id);
      res.status(200).json({ success: true, data: {} });
    } catch (error) {
      next(error);
    }
  }
}
