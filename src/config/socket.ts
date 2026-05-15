import { Server } from "socket.io";
import type { Server as HttpServer } from "http";

export class SocketService {
  private static instance: SocketService;
  private io: Server | null = null;
  private userSockets: Map<string, string[]> = new Map();

  private constructor() {}

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  public initialize(httpServer: HttpServer): void {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL!,
        credentials: true,
      },
    });

    this.io.on("connection", (socket) => {
      const userId = socket.handshake.query.userId as string;
      const role = socket.handshake.query.role as string;
      
      if (userId) {
        const currentSockets = this.userSockets.get(userId) || [];
        this.userSockets.set(userId, [...currentSockets, socket.id]);
        
        // Join user room
        socket.join(`user:${userId}`);
        
        // Join role room
        if (role) {
          socket.join(`role:${role}`);
        }
        
        console.log(`User ${userId} [${role}] connected with socket ${socket.id}`);
      }

      socket.on("disconnect", () => {
        if (userId) {
          const currentSockets = this.userSockets.get(userId) || [];
          const updatedSockets = currentSockets.filter((id) => id !== socket.id);
          if (updatedSockets.length > 0) {
            this.userSockets.set(userId, updatedSockets);
          } else {
            this.userSockets.delete(userId);
          }
          console.log(`User ${userId} disconnected`);
        }
      });
    });
  }

  public async createNotification(data: {
    recipient: string;
    title: string;
    message: string;
    type: string;
    link?: string;
  }): Promise<void> {
    try {
      const { Notification } = await import("../models/Notification.js");
      const mongoose = (await import("mongoose")).default;
      
      const notification = await Notification.create({
        recipient: new mongoose.Types.ObjectId(data.recipient),
        title: data.title,
        message: data.message,
        type: data.type as any,
        ...(data.link ? { link: data.link } : {})
      });

      console.log(`[SocketService] Notification saved, emitting to room: user:${data.recipient}`);
      this.emitToUser(data.recipient, "notification", {
        ...data,
        _id: (notification as any)._id,
        isRead: false,
        createdAt: (notification as any).createdAt
      });
    } catch (error) {
      console.error("[SocketService] Error creating notification:", error);
    }
  }

  public async createNotificationForRole(role: string, data: {
    title: string;
    message: string;
    type: string;
    link?: string;
  }): Promise<void> {
    try {
      const { User } = await import("../models/User.js");
      const users = await User.find({ role: role as any, isActive: true });
      
      const promises = users.map(user => this.createNotification({
        recipient: String(user._id),
        ...data
      }));
      
      await Promise.all(promises);
    } catch (error) {
      console.error("Error creating role notification:", error);
    }
  }

  public emitToUser(userId: string, event: string, data: any): void {
    this.io?.to(`user:${userId}`).emit(event, data);
  }

  public emitToRole(role: string, event: string, data: any): void {
    this.io?.to(`role:${role}`).emit(event, data);
  }
  
  public getIO(): Server | null {
    return this.io;
  }
}

export const socketService = SocketService.getInstance();
