import { db } from "../../db";
import { wallets, users, transactions } from "../../db/schema";
import { eq, desc } from "drizzle-orm";
import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";

// ✅ GET ALL WALLETS (ADMIN)
export const getAllWallets = async (req: Request, res: Response) => {
  try {
    const data = await db
      .select({
        id: wallets.id,
        userId: wallets.userId,
        userName: users.name,
        balance: wallets.balance,
        bonus: wallets.bonusBalance,
        locked: wallets.lockedAmount,
        updatedAt: wallets.updatedAt,
      })
      .from(wallets)
      .leftJoin(users, eq(wallets.userId, users.id));

    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No wallets found",
      });
    }

    const totalBalance = data.reduce(
      (sum, w: any) => sum + Number(w.balance || 0),
      0
    );

    const averageBalance = Math.floor(totalBalance / data.length);

    const transactionsToday = data.length;

    const lockedPrizes = data.reduce(
      (sum, w: any) => sum + Number(w.locked || 0),
      0
    );

    res.json({
      success: true,
      totalBalance,
      averageBalance,
      transactionsToday,
      lockedPrizes,
      wallets: data,
    });
  } catch (error) {
    console.error("Wallet Fetch Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch wallets",
    });
  }
};


// ✅ GET USER WALLET
export const getUserWallet = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const userId = req.user?.id;

    const wallet = await db
      .select()
      .from(wallets)
      .where(eq(wallets.userId, userId))
      .limit(1);

    if (!wallet.length) {
      return res.status(404).json({
        success: false,
        message: "Wallet not found",
      });
    }

    res.json({
      success: true,
      available: Number(wallet[0].balance),
      locked: Number(wallet[0].lockedAmount),
    });

  } catch (error) {
    console.error("User Wallet Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch wallet",
    });
  }
};


// ✅ GET USER TRANSACTIONS
export const getUserTransactions = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const userId = req.user?.id;

    const data = await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt));

    res.json({
      success: true,
      transactions: data,
    });

  } catch (error) {
    console.error("Transactions Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch transactions",
    });
  }
};