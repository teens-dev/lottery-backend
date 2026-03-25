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







