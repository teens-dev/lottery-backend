import { db } from "../../db";
import { wallets, users, transactions } from "../../db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { Request, Response } from "express";

// ✅ ADMIN - ALL WALLETS
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

    const totalBalance = data.reduce(
      (sum, w: any) => sum + Number(w.balance || 0),
      0
    );

    const averageBalance =
      data.length > 0 ? totalBalance / data.length : 0;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const todayTransactions = await db
      .select()
      .from(transactions)
      .where(
        and(
          gte(transactions.createdAt, startOfDay),
          lte(transactions.createdAt, endOfDay)
        )
      );

    const transactionsToday = todayTransactions.length;

    const todayBalance = todayTransactions.reduce(
      (sum: number, txn: any) =>
        txn.type === "Deposit"
          ? sum + Number(txn.amount || 0)
          : sum,
      0
    );

    res.json({
      success: true,
      totalBalance: Number(totalBalance.toFixed(2)),
      averageBalance: Number(averageBalance.toFixed(2)),
      transactionsToday,
      todayBalance: Number(todayBalance.toFixed(2)),
      wallets: data,
    });

  } catch (error) {
    console.error("Wallet API Error:", error);
    res.status(500).json({ success: false });
  }
};


// ✅ USER WALLET
export const getUserWallet = async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;

    const wallet = await db
      .select()
      .from(wallets)
      .where(eq(wallets.userId, userId))
      .limit(1);

    res.json({
      success: true,
      wallet: wallet[0],
    });

  } catch (error) {
    res.status(500).json({ success: false });
  }
};


// ✅ USER TRANSACTIONS
export const getUserTransactions = async (req: any, res: Response) => {
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
    res.status(500).json({ success: false });
  }
};


// ✅ PAY WITH WALLET (SIMPLE)
export const payWithWallet = async (req: any, res: Response) => {
  try {
    const { amount } = req.body;
    const userId = req.user?.id;

    const [wallet] = await db
      .select()
      .from(wallets)
      .where(eq(wallets.userId, userId));

    if (!wallet) {
      return res.status(400).json({ message: "Wallet not found" });
    }

    const balance = Number(wallet.balance);

    if (balance < amount) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    const newBalance = balance - amount;

    await db
      .update(wallets)
      .set({ balance: newBalance.toFixed(2) })
      .where(eq(wallets.userId, userId));

    await db.insert(transactions).values({
  userId,
  walletId: wallet.id, // ✅ REQUIRED
  txnRef: `TXN-${Date.now()}`, // ✅ UNIQUE REF
  amount: amount.toFixed(2),
  type: "withdrawal", // ✅ correct enum
  status: "success",
  note: "Wallet debit",
}); res.json({ success: true });

  } catch (error) {
    res.status(500).json({ success: false });
  }
};