import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

export const protect = (
  req: Request,
  res: Response,
  next: NextFunction
) => {

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer")) {

    return res.status(401).json({
      message: "Not authorized"
    });

  }

  const token = authHeader.split(" ")[1];

  try {

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    );

    (req as any).user = decoded;

    next();

  } catch {

    res.status(401).json({
      message: "Invalid token"
    });

  }

};