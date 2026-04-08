import { db } from "../../db";
import { wallets, users, withdrawals, transactions } from "../../db/schema";
import { eq, sql } from "drizzle-orm";
import { Request, Response } from "express";
import crypto from "crypto";

// ✅ GET ALL WALLETS (ADMIN)
export const getAllWallets = async (req: Request, res: Response) => {
  try {
    // ✅ JOIN USERS + WALLETS
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

    // ✅ CALCULATIONS
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

    // ✅ FINAL RESPONSE
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

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/withdraw - Request a new withdrawal
// ─────────────────────────────────────────────────────────────────────────────
export const requestWithdrawal = async (req: Request, res: Response) => {
  try {
    const { userId, amount, upiId } = req.body;

    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid withdrawal request" });
    }

    await db.transaction(async (tx) => {
      // 1. Fetch the user's wallet
      const userWallets = await tx.select().from(wallets).where(eq(wallets.userId, userId));
      if (userWallets.length === 0) throw new Error("Wallet not found");
      
      const wallet = userWallets[0];
      const withdrawAmount = Number(amount);
      const currentBalance = Number(wallet.balance) || 0;

      // 2. Validate wallet balance
      if (currentBalance < withdrawAmount) {
        throw new Error("Insufficient balance for withdrawal");
      }

      // 3. Deduct from balance and add to locked_amount
      // This ensures the money cannot be spent while the withdrawal is pending admin approval
      await tx
        .update(wallets)
        .set({
          balance: sql`${wallets.balance}::numeric - ${withdrawAmount}::numeric`,
          lockedAmount: sql`${wallets.lockedAmount}::numeric + ${withdrawAmount}::numeric`,
          updatedAt: new Date(),
        })
        .where(eq(wallets.id, wallet.id));

      // 4. Insert withdrawal record (pending)
      await tx.insert(withdrawals).values({
        userId,
        amount: withdrawAmount.toString(),
        status: "pending",
        upiId: upiId || null,
      });
    });

    return res.status(200).json({ success: true, message: "Withdrawal requested successfully. Pending admin approval." });
  } catch (error: any) {
    console.error("Withdraw Error:", error.message);
    return res.status(400).json({ success: false, message: error.message || "Failed to request withdrawal" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/approve-withdraw - Admin approves a pending withdrawal
// ─────────────────────────────────────────────────────────────────────────────
export const approveWithdrawal = async (req: Request, res: Response) => {
  try {
    const { withdrawalId } = req.body;

    if (!withdrawalId) {
      return res.status(400).json({ success: false, message: "Withdrawal ID is required" });
    }

    await db.transaction(async (tx) => {
      // 1. Fetch the withdrawal request
      const pendingWithdrawals = await tx
        .select()
        .from(withdrawals)
        .where(eq(withdrawals.id, withdrawalId));

      if (pendingWithdrawals.length === 0) throw new Error("Withdrawal record not found");
      
      const withdrawal = pendingWithdrawals[0];
      if (withdrawal.status !== "pending") {
        throw new Error("Withdrawal is already processed");
      }

      const withdrawAmount = Number(withdrawal.amount);

      // 2. Fetch the wallet to unlock funds securely
      const userWallets = await tx.select().from(wallets).where(eq(wallets.userId, withdrawal.userId));
      if (userWallets.length === 0) throw new Error("User wallet not found");
      const wallet = userWallets[0];

      // 3. Update withdrawal to success
      await tx
        .update(withdrawals)
        .set({ status: "success" })
        .where(eq(withdrawals.id, withdrawalId));

      // 4. Reduce locked_amount (money actually leaves the system)
      // The balance was already deducted during the request phase.
      await tx
        .update(wallets)
        .set({
          lockedAmount: sql`${wallets.lockedAmount}::numeric - ${withdrawAmount}::numeric`,
          updatedAt: new Date(),
        })
        .where(eq(wallets.id, wallet.id));

      // 5. Insert transaction record to finalize accounting
      const internalTxnRef = `wd_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
      await tx.insert(transactions).values({
        userId: withdrawal.userId,
        walletId: wallet.id,
        txnRef: internalTxnRef,
        amount: withdrawAmount.toString(),
        type: "withdrawal",
        status: "success",
        note: `Withdrawal approved - ID: ${withdrawalId}`,
      });
    });

    return res.status(200).json({ success: true, message: "Withdrawal securely approved and processed." });
  } catch (error: any) {
    console.error("Approve Withdraw Error:", error.message);
    return res.status(400).json({ success: false, message: error.message || "Failed to approve withdrawal" });
  }
};
