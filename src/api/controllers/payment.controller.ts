import { Request, Response } from "express";
import { db } from "../../db";
import { transactions, wallets, tickets, paymentOrders, users, paymentMethods, draws } from "../../db/schema";
import { sql, eq, desc } from "drizzle-orm";
import Razorpay from "razorpay";
import crypto from "crypto";
import { sendPaymentFailureEmail, sendTicketPurchaseEmail } from "../../utils/sendEmail";

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "",
});

// ==================== CREATE ORDER ====================
export const createRazorpayOrder = async (req: any, res: Response) => {
  try {
    const { amount, currency = "INR" } = req.body;
    const userId = req.user?.id;
    let walletId = req.user?.walletId;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!userId || !uuidRegex.test(userId)) {
      return res.status(400).json({ error: "Unauthorized: invalid user session" });
    }

    if (!walletId || !uuidRegex.test(walletId)) {
      const userWallets = await db.select().from(wallets).where(eq(wallets.userId, userId)).limit(1);
      walletId = userWallets[0]?.id ?? null;
    }

    const options = {
      amount: Math.round(amount * 100),
      currency,
      receipt: `rcpt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    try {
      await db.insert(paymentOrders).values({
        userId,
        amount: Math.round(amount * 100),
        razorpayOrderId: order.id,
        status: "pending",
      });

      if (walletId) {
        await db.insert(transactions).values({
          userId,
          walletId,
          txnRef: order.id,
          amount: amount.toString(),
          type: "deposit",
          status: "pending",
          note: "Order created",
        });
      }
    } catch (dbErr: any) {
      console.error("[createOrder] DB log failed:", dbErr.message);
    }

    return res.status(200).json(order);
  } catch (error) {
    console.error("[createOrder] Razorpay error:", error);
    return res.status(500).json({ error: "Failed to create Razorpay order" });
  }
};

// ==================== VERIFY PAYMENT ====================
export const verifyRazorpayPayment = async (req: any, res: Response) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      drawId,
      pickedNumbers,
    } = req.body;

    const userId = req.user?.id;
    const walletId = req.user?.walletId;

    // Signature verification
    const secret = (process.env.RAZORPAY_KEY_SECRET || "").trim();
    const orderId = (razorpay_order_id || "").trim();
    const paymentId = (razorpay_payment_id || "").trim();
    const receivedSig = (razorpay_signature || "").trim();
    const body = orderId + "|" + paymentId;
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    if (expectedSignature !== receivedSig) {
      console.error("[verify] Signature mismatch");
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (user) await sendPaymentFailureEmail(user.email, user.name);
      return res.status(400).json({ error: "Invalid payment signature" });
    }

    // Fulfillment inside transaction
    try {
      await db.transaction(async (tx) => {
        // Idempotency check
        const existingOrder = await tx
          .select()
          .from(paymentOrders)
          .where(eq(paymentOrders.razorpayOrderId, razorpay_order_id));
        if (existingOrder.length === 0) throw new Error(`Order ${razorpay_order_id} not found.`);
        
        const exactAmountInPaise = existingOrder[0].amount;
        const amountInRupees = Number((exactAmountInPaise / 100).toFixed(2));

        // 1. Check if the deposit part is already processed by webhook
        if (existingOrder[0].status === "pending") {
          // Process the deposit since webhook hasn't yet
          await tx.update(paymentOrders).set({ status: "success" }).where(eq(paymentOrders.razorpayOrderId, razorpay_order_id));
          await tx.update(transactions).set({
            status: "success",
            gatewayTxnId: razorpay_payment_id,
            note: `Verified: ${razorpay_payment_id}`,
          }).where(eq(transactions.txnRef, razorpay_order_id));

          let targetWalletId = walletId;
          const userWallets = await tx.select().from(wallets).where(eq(wallets.userId, userId));
          if (userWallets.length > 0) {
            targetWalletId = userWallets[0].id;
            const currentBalance = Number(userWallets[0].balance) || 0;
            const newBalance = currentBalance + amountInRupees;
            await tx.update(wallets).set({ balance: newBalance.toFixed(2), updatedAt: new Date() }).where(eq(wallets.id, targetWalletId));
          } else {
            await tx.insert(wallets).values({
              userId: userId,
              balance: amountInRupees.toFixed(2),
              lockedAmount: "0.00",
            });
          }
        }

        // 2. Buy the ticket using the wallet funds if drawId is present
        if (drawId) {
          const tktTxnRef = `TKT-${razorpay_order_id}`;
          const existingTktTxn = await tx.select().from(transactions).where(eq(transactions.txnRef, tktTxnRef));

          if (existingTktTxn.length > 0) {
            console.log("Ticket already purchased for this order.");
            return; // Idempotent success
          }

          console.log(`[Verify] Purchasing ticket for draw ${drawId}`);
          const numbersStr = pickedNumbers;
          if (!numbersStr) throw new Error("Missing ticket numbers");

          // Check if numbers are booked
          const reqNumbers = numbersStr.split(",").map((n: string) => n.trim()).filter(Boolean);
          const existingTickets = await tx.select({ pickedNumbers: tickets.pickedNumbers }).from(tickets).where(eq(tickets.drawId, drawId));
          for (const t of existingTickets) {
            if (t.pickedNumbers) {
              const booked = t.pickedNumbers.split(",").map((n: string) => n.trim());
              for (const num of reqNumbers) {
                if (booked.includes(num)) {
                  throw new Error(`NUMBERS_BOOKED: Number ${num} is already booked. Your payment will be credited to your wallet shortly.`);
                }
              }
            }
          }

          // Deduct from wallet
          const [userWallet] = await tx.select().from(wallets).where(eq(wallets.userId, userId)).for('update');
          const currentBalance = Number(userWallet.balance) || 0;
          if (currentBalance < amountInRupees) {
            throw new Error("NUMBERS_BOOKED: Insufficient balance after deposit.");
          }
          
          const newBal = currentBalance - amountInRupees;
          await tx.update(wallets).set({ balance: newBal.toFixed(2), updatedAt: new Date() }).where(eq(wallets.id, userWallet.id));

          // Insert ONE ticket
          const uniqueTicketNumber = `TKT-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
          await tx.insert(tickets).values({
            userId: userId,
            drawId: drawId,
            ticketNumber: uniqueTicketNumber,
            pickedNumbers: numbersStr,
            pricePaid: amountInRupees.toFixed(2),
            status: "active",
            purchasedAt: new Date(),
          });

          // Increment draw.currentEntries by 1 (per user's explicit request to keep it +1)
          const [draw] = await tx.select().from(draws).where(eq(draws.id, drawId)).for("update");
          if (!draw) throw new Error(`Draw ${drawId} not found`);

          await tx.update(draws).set({
            currentEntries: draw.currentEntries + 1,
            updatedAt: new Date(),
          }).where(eq(draws.id, drawId));

          // Record Ticket Purchase Transaction
          await tx.insert(transactions).values({
            userId,
            walletId: userWallet.id,
            txnRef: tktTxnRef,
            amount: amountInRupees.toFixed(2),
            type: "ticket_purchase",
            status: "success",
            note: `Auto-purchase from order ${razorpay_order_id}`,
          });

          // Send confirmation email
          const [user] = await tx.select().from(users).where(eq(users.id, userId));
          if (user) {
            await sendTicketPurchaseEmail(user.email, user.name, drawId, numbersStr);
          }
        }
      });

      return res.status(200).json({
        success: true,
        message: "Payment verified and ticket created successfully.",
      });
    } catch (fulfillmentError: any) {
      console.error("Fulfillment Error:", fulfillmentError.message);
      if (fulfillmentError.message && fulfillmentError.message.startsWith("NUMBERS_BOOKED:")) {
        return res.status(400).json({
          success: false,
          message: fulfillmentError.message.replace("NUMBERS_BOOKED: ", ""),
        });
      }
      return res.status(200).json({
        success: true,
        message: "Signature verified. Webhook will handle final update.",
      });
    }
  } catch (error) {
    console.error("Payment Verification Error:", error);
    const userId = req.user?.id;
    if (userId) {
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (user) await sendPaymentFailureEmail(user.email, user.name);
    }
    res.status(500).json({ error: "Internal server error" });
  }
};

// ==================== PAYMENT STATS ====================
export const getPaymentStats = async (req: Request, res: Response) => {
  try {
    const stats = await db
      .select({
        totalRevenue: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'ticket_purchase' AND ${transactions.status} = 'success' THEN ${transactions.amount}::numeric ELSE 0 END), 0)`,
        totalDeposits: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'deposit' AND ${transactions.status} = 'success' THEN ${transactions.amount}::numeric ELSE 0 END), 0)`,
        totalWithdrawals: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'withdrawal' AND ${transactions.status} = 'success' THEN ${transactions.amount}::numeric ELSE 0 END), 0)`,
        totalPending: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.status} = 'pending' THEN ${transactions.amount}::numeric ELSE 0 END), 0)`,
      })
      .from(transactions);

    res.status(200).json(stats[0]);
  } catch (error) {
    console.error("Error fetching payment stats:", error);
    res.status(500).json({ error: "Failed to fetch payment statistics" });
  }
};

// ==================== ADMIN TRANSACTIONS ====================
export const getAdminTransactions = async (req: Request, res: Response) => {
  try {
    const data = await db
      .select({
        id: transactions.id,
        userName: users.name,
        amount: transactions.amount,
        type: transactions.type,
        status: transactions.status,
        method: paymentMethods.name,
        datetime: transactions.createdAt,
      })
      .from(transactions)
      .leftJoin(users, eq(transactions.userId, users.id))
      .leftJoin(paymentMethods, eq(transactions.methodId, paymentMethods.id))
      .orderBy(desc(transactions.createdAt));

    const typeMapping: Record<string, string> = {
      deposit: "Deposit",
      withdrawal: "Withdrawal",
      ticket_purchase: "TicketPurchase",
      prize_payout: "PrizePayout",
      bonus_credit: "BonusCredit",
      referral_reward: "ReferralReward",
      manual_adjustment: "ManualAdjustment",
    };

    const statusMapping: Record<string, string> = {
      pending: "Pending",
      success: "Success",
      failed: "Failed",
      refunded: "Refunded",
    };

    const formattedData = data.map((txn) => ({
      id: txn.id,
      userName: txn.userName || "Unknown User",
      amount: txn.amount,
      type: typeMapping[txn.type as string] || txn.type,
      status: statusMapping[txn.status as string] || txn.status,
      method: txn.method || "Wallet/Gateway",
      datetime: txn.datetime,
    }));

    res.status(200).json({ success: true, data: formattedData });
  } catch (error: any) {
    console.error("Error fetching admin transactions:", error.message);
    res.status(500).json({ success: false, message: "Failed to fetch transactions" });
  }
};

// ==================== WEBHOOK HANDLER ====================
export const handleRazorpayWebhook = async (req: Request, res: Response) => {
  console.log("[Webhook] Received Razorpay webhook request");
  const razorpaySignature = req.headers["x-razorpay-signature"] as string;
  if (!razorpaySignature) {
    console.error("[Webhook] Missing X-Razorpay-Signature header — rejected");
    return res.status(400).json({ error: "Missing signature header" });
  }

  const rawBody = (req as any).rawBody as Buffer;
  if (!rawBody || rawBody.length === 0) {
    console.error("[Webhook] Empty or missing raw request body — rejected");
    return res.status(400).json({ error: "Empty request body" });
  }

  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "";
  if (!webhookSecret) {
    console.error("[Webhook] RAZORPAY_WEBHOOK_SECRET env var is not set!");
    return res.status(500).json({ error: "Webhook secret not configured" });
  }

  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  if (expectedSignature !== razorpaySignature) {
    console.error("[Webhook] Signature mismatch — possible forged request");
    return res.status(400).json({ error: "Invalid webhook signature" });
  }

  console.log("[Webhook] Signature verified ✅");

  let payload: any;
  try {
    payload = JSON.parse(rawBody.toString("utf8"));
  } catch (parseError) {
    console.error("[Webhook] Failed to parse JSON payload:", parseError);
    return res.status(400).json({ error: "Invalid JSON payload" });
  }

  const eventType: string = payload?.event;
  console.log(`[Webhook] Event type: "${eventType}"`);

  if (eventType !== "payment.captured") {
    console.log(`[Webhook] Event "${eventType}" not handled — acknowledging`);
    return res.status(200).json({ message: "Event acknowledged, not processed" });
  }

  const paymentEntity = payload?.payload?.payment?.entity;
  if (!paymentEntity) {
    console.error("[Webhook] payment.entity missing in payload — malformed");
    return res.status(400).json({ error: "Malformed webhook payload" });
  }

  const {
    id: razorpayPaymentId,
    order_id: razorpayOrderId,
    amount: amountInPaise,
  } = paymentEntity;

  console.log(`[Webhook] Captured — order: ${razorpayOrderId}, payment: ${razorpayPaymentId}, amount: ${amountInPaise} paise`);

  if (!razorpayOrderId) {
    console.error("[Webhook] order_id missing from payment entity");
    return res.status(400).json({ error: "order_id not found in payload" });
  }

  const existingOrders = await db
    .select()
    .from(paymentOrders)
    .where(eq(paymentOrders.razorpayOrderId, razorpayOrderId));

  if (existingOrders.length === 0) {
    console.warn(`[Webhook] No payment_order found for order: ${razorpayOrderId} — skipping`);
    return res.status(200).json({ message: "Payment order not found — skipped" });
  }

  const pOrder = existingOrders[0];
  if (pOrder.status === "success") {
    console.log(`[Webhook] Payment order already "success" — duplicate ignored`);
    return res.status(200).json({ message: "Already processed — no-op" });
  }

  const existingTxns = await db
    .select()
    .from(transactions)
    .where(eq(transactions.txnRef, razorpayOrderId));

  if (existingTxns.length === 0) {
    console.warn(`[Webhook] No transaction found for order: ${razorpayOrderId} — skipping`);
    return res.status(200).json({ message: "Transaction not found — skipped" });
  }

  const txn = existingTxns[0];

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(paymentOrders)
        .set({ status: "success" })
        .where(eq(paymentOrders.razorpayOrderId, razorpayOrderId));

      await tx
        .update(transactions)
        .set({
          status: "success",
          gatewayTxnId: razorpayPaymentId,
          note: `Webhook: payment.captured — ${razorpayPaymentId}`,
        })
        .where(eq(transactions.txnRef, razorpayOrderId));

      const amountInRupees = (amountInPaise / 100).toFixed(2);
      await tx
        .update(wallets)
        .set({
          balance: sql`${wallets.balance}::numeric + ${amountInRupees}::numeric`,
          updatedAt: new Date(),
        })
        .where(eq(wallets.id, txn.walletId));

      console.log(`[Webhook] Wallet ${txn.walletId} credited ₹${amountInRupees}`);
    });

    console.log(`[Webhook] ✅ payment.captured processed for order ${razorpayOrderId}`);
    return res.status(200).json({ message: "Webhook processed successfully" });
  } catch (dbError: any) {
    console.error("[Webhook] DB transaction failed:", dbError.message);
    return res.status(500).json({ error: "Database error processing webhook" });
  }
};

// ==================== UTILITY: UPDATE WALLET BALANCE ====================
export const updateWalletBalance = async (
  userId: string,
  amount: number,
  type: "deposit" | "withdrawal" | "ticket_purchase" | "prize_payout" | "bonus_credit" | "referral_reward" | "manual_adjustment"
) => {
  try {
    return await db.transaction(async (tx) => {
      const userWallets = await tx.select().from(wallets).where(eq(wallets.userId, userId));
      if (userWallets.length === 0) throw new Error("Wallet not found");
      const wallet = userWallets[0];
      const currentBalance = Number(wallet.balance) || 0;
      const newBalance = currentBalance + amount;
      if (newBalance < 0) throw new Error("Insufficient wallet balance");

      await tx
        .update(wallets)
        .set({ balance: newBalance.toFixed(2), updatedAt: new Date() })
        .where(eq(wallets.id, wallet.id));

      const internalTxnRef = `txn_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
      await tx.insert(transactions).values({
        userId,
        walletId: wallet.id,
        txnRef: internalTxnRef,
        amount: Math.abs(amount).toString(),
        type,
        status: "success",
        note: `Internal wallet update: ${type}`,
      });

      return { success: true, message: "Wallet balance updated securely." };
    });
  } catch (error: any) {
    console.error("[Wallet Utility] Failed:", error.message);
    return { success: false, error: error.message };
  }
};