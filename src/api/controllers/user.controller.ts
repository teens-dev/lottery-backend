import { Request, Response } from "express";
import { db } from "../../db";
import { users } from "../../db/schema";



export const getUsersWithCount = async (req: Request, res: Response) => {
  try {
    const result = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
       })
      .from(users);

    res.status(200).json({
      success: true,
      totalUsers: result.length,
      users: result,
    });
  } catch (error: any) {
    console.error("🔥 ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message,
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