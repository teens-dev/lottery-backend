import { db } from "../../db";
import { wallets, users, transactions, tickets, draws } from "../../db/schema";
import { eq, desc } from "drizzle-orm";
import { Request, Response } from "express";
import { sendTicketPurchaseEmail, sendPaymentFailureEmail } from "../../utils/sendEmail";
import { AuthRequest } from "../middleware/auth.middleware";
import crypto from "crypto";

// ==================== GET ALL WALLETS (ADMIN) ====================
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
      return res.status(404).json({ success: false, message: "No wallets found" });
    }

    const totalBalance = data.reduce((sum, w: any) => sum + Number(w.balance || 0), 0);
    const averageBalance = Math.floor(totalBalance / data.length);
    const transactionsToday = data.length;
    const lockedPrizes = data.reduce((sum, w: any) => sum + Number(w.locked || 0), 0);

    res.json({ success: true, totalBalance, averageBalance, transactionsToday, lockedPrizes, wallets: data });
  } catch (error) {
    console.error("Wallet Fetch Error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch wallets" });
  }
};

// ==================== GET USER WALLET ====================
export const getUserWallet = async (req: AuthRequest, res: Response) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const userId = (req.query.userId as string) || req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Not authorized", message: "User ID missing" });
    }

    let wallet = await db.select().from(wallets).where(eq(wallets.userId, userId)).limit(1);
    if (!wallet.length) {
      console.log(`[Wallet] Provisioning missing wallet for user ${userId}`);
      const [newWallet] = await db.insert(wallets).values({ userId, balance: "0.00", lockedAmount: "0.00" }).returning();
      wallet = [newWallet];
    }

    res.json({ success: true, available: Number(wallet[0].balance), locked: Number(wallet[0].lockedAmount) });
  } catch (error) {
    console.error("User Wallet Error:", error);
    res.status(500).json({ success: false, error: "Internal server error", message: "Failed to fetch wallet" });
  }
};

// ==================== GET USER TRANSACTIONS ====================
export const getUserTransactions = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const data = await db.select().from(transactions).where(eq(transactions.userId, userId)).orderBy(desc(transactions.createdAt));
    res.json({ success: true, transactions: data });
  } catch (error) {
    console.error("Transactions Error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch transactions" });
  }
};

// ==================== PAY WITH WALLET ====================
export const payWithWallet = async (req: AuthRequest, res: Response) => {
  const { drawId, ticketNumbers, totalAmount } = req.body;
  const userId = req.user?.id;

  if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
  if (!drawId || !ticketNumbers || !totalAmount) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) return res.status(401).json({ success: false, message: "User not found" });

  try {
    await db.transaction(async (tx) => {
      // 1. Lock wallet and check balance
      const [userWallet] = await tx.select().from(wallets).where(eq(wallets.userId, userId)).for('update');
      if (!userWallet) throw new Error("Wallet not found");
      const balance = Number(userWallet.balance);
      const amount = Number(totalAmount);
      if (balance < amount) {
        throw new Error(`Insufficient balance. Available ₹${balance}, Required ₹${amount}`);
      }

      // 2. Deduct balance
      const newBalance = balance - amount;
      await tx.update(wallets).set({ balance: newBalance.toFixed(2), updatedAt: new Date() }).where(eq(wallets.id, userWallet.id));

      // 3. Parse selected numbers
      const selectedNumbers = ticketNumbers.split(",").map((n: string) => n.trim()).filter((n: string) => n !== "");
      if (selectedNumbers.length === 0) throw new Error("No numbers selected");

      // Check if any selected number is already booked for this draw
      const existingTickets = await tx.select({ pickedNumbers: tickets.pickedNumbers }).from(tickets).where(eq(tickets.drawId, drawId));
      for (const t of existingTickets) {
        if (t.pickedNumbers) {
          const booked = t.pickedNumbers.split(",").map((n: string) => n.trim());
          for (const num of selectedNumbers) {
            if (booked.includes(num)) {
              throw new Error(`NUMBERS_BOOKED: Number ${num} is already booked for this draw.`);
            }
          }
        }
      }

      // 4. Generate unique ticket number
      const uniqueTicketNumber = `TKT-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;

      // 5. Insert ONE ticket (all numbers stored as comma-separated string)
      await tx.insert(tickets).values({
        userId,
        drawId,
        ticketNumber: uniqueTicketNumber,
        pickedNumbers: selectedNumbers.join(","),
        pricePaid: amount.toFixed(2),
        isAutoPick: false,
        status: "active",
        purchasedAt: new Date(),
      });

      // 6. Increment draw.currentEntries by 1
      const [draw] = await tx.select().from(draws).where(eq(draws.id, drawId)).for('update');
      if (!draw) throw new Error(`Draw ${drawId} not found`);
      await tx.update(draws).set({ currentEntries: draw.currentEntries + 1, updatedAt: new Date() }).where(eq(draws.id, drawId));

      // 7. Record transaction
      await tx.insert(transactions).values({
        userId,
        walletId: userWallet.id,
        txnRef: `WLT-${crypto.randomBytes(6).toString("hex").toUpperCase()}`,
        amount: amount.toFixed(2),
        type: "ticket_purchase",
        status: "success",
        note: `Wallet purchase for draw ${drawId}, numbers: ${selectedNumbers.join(", ")}`,
      });
    });

    // Send email outside transaction
    const selectedNumbers = ticketNumbers.split(",").map((n: string) => n.trim()).filter((n: string) => n !== "");
    await sendTicketPurchaseEmail(user.email, user.name, drawId, selectedNumbers.join(", "));

    return res.json({ success: true, message: "✅ Ticket purchased successfully using wallet balance." });
  } catch (error: any) {
    console.error("Wallet Pay Error:", error);
    if (!error.message || !error.message.startsWith("NUMBERS_BOOKED:")) {
      await sendPaymentFailureEmail(user.email, user.name);
    }
    const msg = error.message && error.message.startsWith("NUMBERS_BOOKED:")
      ? error.message.replace("NUMBERS_BOOKED: ", "")
      : (error.message || "Payment failed");
    return res.status(400).json({ success: false, message: msg });
  }
};