import { Request, Response } from "express";
import { db } from "../../db/index";
import { users, wallets, transactions } from "../../db/schema";
import { eq } from "drizzle-orm";

// Get All Users
export const getUsers = async (req: Request, res: Response) => {
  try {
    const result = await db
      .select()
      .from(users);

    res.json({
      success: true,
      data: result,
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
};

// Get Users With Count
export const getUsersWithCount = async (req: Request, res: Response) => {
  try {
    const result = await db.select().from(users);

    res.json({
      success: true,
      count: result.length,
      data: result,
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
};


// Get Single User Details
export const getUserById = async (req: Request, res: Response) => {
  try {

    const id = req.params.id as string;

    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, id));

    const wallet = await db
      .select()
      .from(wallets)
      .where(eq(wallets.userId, id));

    const txn = await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, id));

    res.json({
      success: true,
      data: {
        user: user[0],
        wallet: wallet[0],
        transactions: txn
      }
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server Error"
    });
  }
};