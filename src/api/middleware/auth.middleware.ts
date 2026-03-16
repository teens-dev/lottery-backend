import { Request, Response, NextFunction } from "express";

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
    // Temporary user for testing (Swagger / Postman)
    req.user = {
      id: "f6d0c61e-1882-4264-8e7a-36736a994300",
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized user",
    });
  }
};