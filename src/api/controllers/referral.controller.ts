import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { db } from "../../db/db";
import { referralCodes } from "../../db/schema";
import { eq } from "drizzle-orm";

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

    /* Fetch existing referral */

    const existing = await db
      .select()
      .from(referralCodes)
      .where(eq(referralCodes.userId, user.id))
      .limit(1);

    if (!existing.length) {
      return res.status(404).json({
        success: false,
        message: "Referral not found",
      });
    }

    res.json({
      success: true,
      referralId: existing[0].code
    });

  } catch (error) {

    console.error("Referral Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch referral",
    });

  }
};