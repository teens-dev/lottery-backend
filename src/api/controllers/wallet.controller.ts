import { db } from "../../db";
import { wallets, users, transactions, tickets } from "../../db/schema";
import { eq, desc } from "drizzle-orm";
import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import crypto from "crypto";

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
    // 1. Disable Aggressive Browser Caching (Fixes 304 Not Modified issue during polling)
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

    // Priority: Query param (for polling support) or Auth token
    const userId = (req.query.userId as string) || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Not authorized",
        message: "User ID missing"
      });
    }

    let wallet = await db
      .select()
      .from(wallets)
      .where(eq(wallets.userId, userId))
      .limit(1);

    // 2. RESILIENT PROVISIONING: Create wallet if missing (legacy users or broken registrations)
    if (!wallet.length) {
      console.log(`[Wallet] Provisioning missing wallet row on-demand for user ${userId}`);
      const [newWallet] = await db
        .insert(wallets)
        .values({
          userId: userId,
          balance: "0.00",
          lockedAmount: "0.00",
        })
        .returning();
      wallet = [newWallet];
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
      error: "Internal server error",
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


// ✅ PAY WITH WALLET (Unified Flow)
export const payWithWallet = async (req: AuthRequest, res: Response) => {
  const { drawId, ticketNumbers, totalAmount } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  try {
    await db.transaction(async (tx) => {

  // 1️⃣ Get Wallet
  const [userWallet] = await tx
    .select()
    .from(wallets)
    .where(eq(wallets.userId, userId));

  const balance = Number(userWallet.balance);

  if (balance < totalAmount) {
    throw new Error("Insufficient balance");
  }

  // 2️⃣ Deduct Balance
  const newBalance = balance - totalAmount;

  await tx.update(wallets)
    .set({ balance: newBalance.toFixed(2), updatedAt: new Date() })
    .where(eq(wallets.id, userWallet.id));


const year = new Date().getFullYear();

// get next ticket number from postgres sequence
// const seqResult = await tx.execute(
//   `SELECT nextval('ticket_number_seq') as seq`
// );

// const seq = seqResult.rows[0].seq;

// const ticketGroupNumber =
//   `TKT-${year}-${String(seq).padStart(6, "0")}`;


  // 3️⃣ Prepare numbers
  const ticketNumbersArray = ticketNumbers.split(",").map((n: string) => n.trim());
  const pickedNumbersString = ticketNumbersArray.join(",");



  // 4️⃣ Insert Ticket
  await tx.insert(tickets).values({
    userId,
    drawId,
    // ticketNumber: ticketGroupNumber,
    pricePaid: totalAmount.toFixed(2),
    pickedNumbers: pickedNumbersString,
    isAutoPick: false,
    status: "active",
  });



  // 5️⃣ Log Transaction
  await tx.insert(transactions).values({
    userId,
    walletId: userWallet.id,
    txnRef: `WLT-${crypto.randomBytes(8).toString("hex").toUpperCase()}`,
    amount: totalAmount.toFixed(2),
    type: "ticket_purchase",
    status: "success",
    note: `Wallet Purchase: Draw ${drawId}`,
  });
    });

    res.json({
      success: true,
      message: "Ticket purchased successfully",
    });
  } catch (error) {
    console.error("Payment Error:", error);

    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : "Payment failed",
    });
  }
};
