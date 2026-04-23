import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

export interface AuthRequest extends Request {
  user?: any;
}

export const protect = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  /*
    PRIORITY FIX:

    For admin pages like:
    /api/payments/stats
    /api/payments/transactions

    browser may send BOTH:
    token
    admin_token

    If normal user token is picked first,
    adminOnly middleware fails with 403.

    So:
    - admin routes use admin_token first
    - normal routes use user token first
  */

  const isAdminRoute =
    req.originalUrl.includes("/api/admin") ||
    req.originalUrl.includes("/api/payments/stats") ||
    req.originalUrl.includes("/api/payments/transactions");

  const token = isAdminRoute
    ? req.cookies?.admin_token || req.cookies?.token
    : req.cookies?.token || req.cookies?.admin_token;

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

    console.log(
      `[Auth] ${isAdminRoute ? "Admin" : "User"} route authenticated`
    );

    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }
};