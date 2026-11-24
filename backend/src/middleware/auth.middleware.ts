import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";

interface JwtPayload {
  userId: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;
    const cookieToken = req.cookies?.session;

    const token = cookieToken ?? (authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is required",
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not configured");

      return res.status(500).json({
        success: false,
        message: "Server authentication configuration error",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentication session is no longer valid",
      });
    }

    req.user = {
      userId: user.id,
      role: user.role,
    };

    next();
  } catch (error) {
    console.error("Authentication error:", error);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token",
    });
  }
};

export const requireRole = (...allowedRoles: string[]) => {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access this resource",
      });
    }

    next();
  };
};