import type { Request, Response, NextFunction } from "express";
import { Notification } from "../models/Notification.js";
import mongoose from "mongoose";

export class NotificationController {
  public async getMyNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;

      const recipientId = new mongoose.Types.ObjectId(req.userId as string);

      const total = await Notification.countDocuments({ recipient: recipientId } as any);
      const notifications = await Notification.find({ recipient: recipientId } as any)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const unreadCount = await Notification.countDocuments({ 
        recipient: recipientId, 
        isRead: false 
      } as any);

      res.status(200).json({
        success: true,
        data: notifications,
        unreadCount,
        total,
        page,
        pages: Math.ceil(total / limit)
      });
    } catch (error) {
      next(error);
    }
  }

  public async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await Notification.findOneAndUpdate(
        { _id: id as any, recipient: req.userId as any },
        { isRead: true }
      );
      res.status(200).json({ success: true, message: "Notification marked as read" });
    } catch (error) {
      next(error);
    }
  }

  public async markAllAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await Notification.updateMany(
        { recipient: req.userId as any, isRead: false },
        { isRead: true }
      );
      res.status(200).json({ success: true, message: "All notifications marked as read" });
    } catch (error) {
      next(error);
    }
  }
}
