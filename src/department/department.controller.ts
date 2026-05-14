import type { Request, Response, NextFunction } from "express";
import { Department } from "../models/Department.js";

export class DepartmentController {
  public async getDepartments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const departments = await Department.find();
      res.status(200).json({ success: true, count: departments.length, data: departments });
    } catch (error) {
      next(error);
    }
  }

  public async getDepartmentById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const department = await Department.findById(req.params.id);
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
}
