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
  // ✅ Support both standard user tokens and admin dashboard tokens
  const token = req.cookies?.admin_token || req.cookies?.token;
  
  if (req.cookies?.admin_token) {
    console.log("[Auth] Admin token detected");
  }

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