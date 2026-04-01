import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";

export const generateReferral = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const referralId =
      "REF" + Math.floor(100000 + Math.random() * 900000);

    res.json({
      success: true,
      referralId,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to generate referral",
    });
  }
};