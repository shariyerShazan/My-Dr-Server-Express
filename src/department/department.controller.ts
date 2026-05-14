import mongoose from "mongoose";
import type { Request, Response, NextFunction } from "express";
import { Department } from "../models/Department.js";

export class DepartmentController {
  public async getDepartments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;
      const search = req.query.search as string;

      let query: any = {};
      if (search) {
        query.name = { $regex: search, $options: "i" };
      }

      const total = await Department.countDocuments(query);
      const departments = await Department.find(query)
        .populate("doctorCount")
        .populate("doctors", "firstName lastName")
        .skip(skip)
        .limit(limit);

      res.status(200).json({ 
        success: true, 
        data: departments,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      next(error);
    }
  }

  public async getDepartmentById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const department = await Department.findById(req.params.id).populate("headDoctor");
      if (!department) {
        res.status(404).json({ success: false, message: "Department not found" });
        return;
      }
      res.status(200).json({ success: true, data: department });
    } catch (error) {
      next(error);
    }
  }

  public async createDepartment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const department = await Department.create(req.body);
      res.status(201).json({ success: true, data: department });
    } catch (error) {
      next(error);
    }
  }

  public async updateDepartment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const department = await Department.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!department) {
        res.status(404).json({ success: false, message: "Department not found" });
        return;
      }
      res.status(200).json({ success: true, data: department });
    } catch (error) {
      next(error);
    }
  }

  public async deleteDepartment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const department = await Department.findByIdAndDelete(req.params.id);
      if (!department) {
        res.status(404).json({ success: false, message: "Department not found" });
        return;
      }

      // Cleanup: Unset department field on all doctors in this department
      await mongoose.model('Doctor').updateMany(
        { department: req.params.id as any }, 
        { $unset: { department: "" } }
      );

      res.status(200).json({ success: true, message: "Department deleted and staff associations cleared" });
    } catch (error) {
      next(error);
    }
  }
}
