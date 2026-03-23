import { Request, Response } from "express";
import { db } from "../../db/db";
import { users } from "../../db/schema";

export const getUsers = async (req: Request, res: Response) => {
  try {
    const result = await db.select().from(users);
   

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server Error"
    });
  }
};