import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { db } from "../../db";
import { wallets, transactions } from "../../db/schema";
import { eq, desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

interface AuthRequest extends Request {
  user?: {
    id: string;
  };
}

/* ================= AUTH ================= */

const getUserFromCookie = (req: Request): string | null => {
  const token = req.cookies?.token;

  if (!token) return null;

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as { userId: string };

    return decoded.userId;
  } catch (err) {
    console.log("❌ Invalid Token");
    return null;
  }
};

const attachUser = (req: AuthRequest): boolean => {
  const cookieUser = getUserFromCookie(req);

  if (cookieUser) {
    req.user = { id: cookieUser };
    return true;
  }

  const queryUser = req.query.userId as string;

  if (queryUser) {
    req.user = { id: queryUser };
    return true;
  }

  return false;
};

/* ================= GET BALANCE ================= */

export const getWalletBalance = async (req: AuthRequest, res: Response) => {
  try {
    if (!attachUser(req)) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const userId = req.user!.id;
    console.log("👉 Fetch Wallet:", userId);

    let wallet = await db.query.wallets.findFirst({
      where: eq(wallets.userId, userId),
    });

    if (!wallet) {
      console.log("⚠️ Creating new wallet...");

      const newWallet = await db
        .insert(wallets)
        .values({
          id: uuidv4(),
          userId,
          balance: "0",
          bonusBalance: "0",
          currency: "INR",
        })
        .returning();

      wallet = newWallet[0];
    }

    return res.status(200).json({
      success: true,
      data: {
        balance: Number(wallet.balance),
        bonus_balance: Number(wallet.bonusBalance || 0),
      },
    });
  } catch (error: any) {
    console.error("❌ FULL ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message, // 🔥 SHOW REAL ERROR
    });
  }
};

/* ================= DEPOSIT ================= */

export const depositWallet = async (req: AuthRequest, res: Response) => {
  try {
    if (!attachUser(req)) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const userId = req.user!.id;
    const { amount, method_id } = req.body;

    console.log("👉 Deposit:", userId, amount);

    const depositAmount = Number(amount);

    if (!depositAmount || depositAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid amount",
      });
    }

    let wallet = await db.query.wallets.findFirst({
      where: eq(wallets.userId, userId),
    });

    if (!wallet) {
      const newWallet = await db
        .insert(wallets)
        .values({
          id: uuidv4(),
          userId,
          balance: "0",
          bonusBalance: "0",
          currency: "INR",
        })
        .returning();

      wallet = newWallet[0];
    }

    const newBalance = Number(wallet.balance) + depositAmount;

    await db.transaction(async (tx) => {
      await tx
        .update(wallets)
        .set({ balance: newBalance.toString() })
        .where(eq(wallets.userId, userId));

      await tx.insert(transactions).values({
        id: uuidv4(),
        userId,
        walletId: wallet.id,
        methodId: method_id ?? null,
        txnRef: `DEP-${Date.now()}`,
        amount: depositAmount.toString(),
        type: "deposit",
        status: "success",
        createdAt: new Date(),
      });
    });

    return res.status(200).json({
      success: true,
      data: { balance: newBalance },
    });
  } catch (error: any) {
    console.error("❌ FULL ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ================= TRANSACTIONS ================= */

export const getTransactions = async (req: AuthRequest, res: Response) => {
  try {
    if (!attachUser(req)) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const userId = req.user!.id;

    const txns = await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt));

    return res.status(200).json({
      success: true,
      data: txns,
    });
  } catch (error: any) {
    console.error("❌ FULL ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ================= PAY TICKET ================= */

export const payTicket = async (req: AuthRequest, res: Response) => {
  try {
    if (!attachUser(req)) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const userId = req.user!.id;
    const { amount } = req.body;

    console.log("👉 Ticket:", userId, amount);

    const ticketAmount = Number(amount);

    if (!ticketAmount || ticketAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid amount",
      });
    }

    const wallet = await db.query.wallets.findFirst({
      where: eq(wallets.userId, userId),
    });

    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: "Wallet not found",
      });
    }

    if (Number(wallet.balance) < ticketAmount) {
      return res.status(400).json({
        success: false,
        message: "Insufficient balance",
      });
    }

    const newBalance = Number(wallet.balance) - ticketAmount;

    await db.transaction(async (tx) => {
      await tx
        .update(wallets)
        .set({ balance: newBalance.toString() })
        .where(eq(wallets.userId, userId));

      await tx.insert(transactions).values({
        id: uuidv4(),
        userId,
        walletId: wallet.id,
        txnRef: `TICKET-${Date.now()}`,
        amount: ticketAmount.toString(),
        type: "ticket_purchase",
        status: "success",
        createdAt: new Date(),
      });
    });

    return res.status(200).json({
      success: true,
      data: { balance: newBalance },
    });
  } catch (error: any) {
    console.error("❌ FULL ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};