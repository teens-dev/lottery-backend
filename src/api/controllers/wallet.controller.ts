import { Request, Response } from "express";
import { db } from "../../db";
import { wallets, transactions } from "../../db/schema";
import { eq, desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

interface AuthRequest extends Request {
  user?: {
    id: string;
  };
}

/* =====================================================
   Get Wallet Balance
===================================================== */

export const getWalletBalance = async (req: AuthRequest, res: Response) => {
  try {

    const userId = req.user?.id;

    console.log("👉 Fetching Wallet for User:", userId); // 🔥 DEBUG

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    let wallet = await db.query.wallets.findFirst({
      where: eq(wallets.userId, userId)
    });

    // create wallet if not exists
    if (!wallet) {
      console.log("⚠️ Wallet not found → creating new wallet");

      const newWallet = await db.insert(wallets).values({
        id: uuidv4(),
        userId,
        balance: "0",
        bonusBalance: "0",
        currency: "INR"
      }).returning();

      wallet = newWallet[0];
    }

    return res.status(200).json({
      success: true,
      data: {
        balance: Number(wallet.balance),
        bonus_balance: Number(wallet.bonusBalance || 0)
      }
    });

  } catch (error) {
    console.error("❌ Wallet Balance Error:", error);

    return res.status(500).json({
      success: false,
      message: "Error fetching wallet balance"
    });
  }
};


/* =====================================================
   Deposit Money
===================================================== */

export const depositWallet = async (req: AuthRequest, res: Response) => {
  try {

    const userId = req.user?.id;
    const { amount, method_id } = req.body;

    console.log("👉 Deposit for User:", userId, "Amount:", amount);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    const depositAmount = Number(amount);

    if (!depositAmount || depositAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid amount"
      });
    }

    let wallet = await db.query.wallets.findFirst({
      where: eq(wallets.userId, userId)
    });

    // auto create wallet if missing
    if (!wallet) {
      const newWallet = await db.insert(wallets).values({
        id: uuidv4(),
        userId,
        balance: "0",
        bonusBalance: "0",
        currency: "INR"
      }).returning();

      wallet = newWallet[0];
    }

    const newBalance = Number(wallet.balance) + depositAmount;

    await db.transaction(async (tx) => {

      await tx.update(wallets)
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
        createdAt: new Date()
      });

    });

    return res.status(200).json({
      success: true,
      message: "Deposit successful",
      data: {
        balance: newBalance
      }
    });

  } catch (error) {
    console.error("❌ Deposit Error:", error);

    return res.status(500).json({
      success: false,
      message: "Deposit failed"
    });
  }
};


/* =====================================================
   Get Wallet Transactions
===================================================== */

export const getTransactions = async (req: AuthRequest, res: Response) => {
  try {

    const userId = req.user?.id;

    console.log("👉 Fetch Transactions for:", userId);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    const txns = await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt));

    return res.status(200).json({
      success: true,
      data: txns
    });

  } catch (error) {
    console.error("❌ Transaction Error:", error);

    return res.status(500).json({
      success: false,
      message: "Error fetching transactions"
    });
  }
};


/* =====================================================
   Pay Ticket using Wallet
===================================================== */

export const payTicket = async (req: AuthRequest, res: Response) => {
  try {

    const userId = req.user?.id;
    const { amount } = req.body;

    console.log("👉 Ticket Payment User:", userId, "Amount:", amount);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    const ticketAmount = Number(amount);

    if (!ticketAmount || ticketAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid amount"
      });
    }

    const wallet = await db.query.wallets.findFirst({
      where: eq(wallets.userId, userId)
    });

    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: "Wallet not found"
      });
    }

    if (Number(wallet.balance) < ticketAmount) {
      return res.status(400).json({
        success: false,
        message: "Insufficient balance"
      });
    }

    const newBalance = Number(wallet.balance) - ticketAmount;

    await db.transaction(async (tx) => {

      await tx.update(wallets)
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
        createdAt: new Date()
      });

    });

    return res.status(200).json({
      success: true,
      message: "Ticket purchased successfully",
      data: {
        balance: newBalance
      }
    });

  } catch (error) {
    console.error("❌ Ticket Payment Error:", error);

    return res.status(500).json({
      success: false,
      message: "Payment failed"
    });
  }
};