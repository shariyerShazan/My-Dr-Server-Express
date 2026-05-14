
import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

// Augment Express Request type to include userId
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

interface JwtPayload {
  userId: string;
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ success: false, message: "Authorization token missing or invalid format" });
      return;
    }

    const token : any = authHeader.split(" ")[1];
    
    // In production, ensure process.env.JWT_SECRET is defined
    const secret = process.env.JWT_SECRET || "fallback_secret";
    
    const decoded = jwt.verify(token, secret) as JwtPayload;

    // As requested: req.userId === decoded.userId
    req.userId = decoded.userId;

    next();
  } catch (error) {
    res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};
