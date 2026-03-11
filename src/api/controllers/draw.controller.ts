import { Request, Response } from "express";
import { db } from "../../db";
import { draws } from "../../db/schema";

export const getDraws = async (req: Request, res: Response) => {
  try {

    const allDraws = await db.select().from(draws);

    res.status(200).json({
      success: true,
      data: allDraws
    });

  } catch (error) {

    console.error("Error fetching draws:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch draws"
    });

  }
};