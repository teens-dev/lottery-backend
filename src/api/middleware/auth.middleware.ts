import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

interface AuthRequest extends Request {
  user?: {
    id: string;
  };
}

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {

    const token = req.cookies?.token;

    // 🟢 1. JWT LOGIN (FUTURE - PRIORITY)
    if (token) {
      try {
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET as string
        ) as { userId: string };

        req.user = { id: decoded.userId };

        console.log("✅ JWT USER:", decoded.userId);
        return next();

      } catch (err) {
        console.error("❌ Invalid JWT:", err);

        return res.status(401).json({
          success: false,
          message: "Invalid token"
        });
      }
    }

    // 🟡 2. QUERY USER (TESTING / SWAGGER)
    const dynamicUserId = req.query.userId as string;

    if (dynamicUserId) {
      req.user = { id: dynamicUserId };

      console.log("🟡 QUERY USER:", dynamicUserId);
      return next();
    }

    // ❌ 3. NO USER → ERROR (NO WRONG DEFAULT)
    return res.status(401).json({
      success: false,
      message: "User not authenticated (send userId or login)"
    });

  } catch (error: any) {
    console.error("❌ Auth Middleware Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Middleware error"
    });
  }
};