import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.middleware";

export const adminOnly = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  const role = String(req.user.role || "").toLowerCase();

  // ✅ Allow any admin-type role
  if (!role.includes("admin")) {
    return res.status(403).json({
      success: false,
      message: "Access denied. Admins only",
    });
  }

  next();
};

import jwt from "jsonwebtoken";



export const protect = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Not authorized. Token missing",
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    );

    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }
};