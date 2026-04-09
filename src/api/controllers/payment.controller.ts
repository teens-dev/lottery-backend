import { Request, Response } from "express";
import { db } from "../../db";
import { transactions, wallets, tickets, paymentOrders, users, paymentMethods } from "../../db/schema";
import { sql, eq, and, desc } from "drizzle-orm";
import Razorpay from "razorpay";
import crypto from "crypto";

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "",
});

/**
 * @swagger
 * /api/payments/create-order:
 *   post:
 *     summary: Create a Razorpay order and log pending transaction
 *     tags: [Payments]
 */
export const createRazorpayOrder = async (req: Request, res: Response) => {
  try {
    const { amount, currency = "INR", userId, walletId } = req.body;

    // [DEBUG]: Log incoming request data
    console.log("Creating Order - Request Body:", req.body);

    // Validation for UUID format (standard UUID v4 regex)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!userId || !uuidRegex.test(userId)) {
      console.error("Invalid userId format:", userId);
      return res.status(400).json({ error: "Invalid userId format. Expected UUID." });
    }

    if (!walletId || !uuidRegex.test(walletId)) {
      console.error("Invalid walletId format:", walletId);
      return res.status(400).json({ error: "Invalid walletId format. Expected UUID." });
    }

    const options = {
      amount: amount * 100, // in paise
      currency,
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    // Log transaction as 'pending' immediately
    try {
      // 1. Store payment_orders record BEFORE the actual payment happens.
      // Why? This explicitly tracks the Razorpay order lifecycle locally.
      // How webhook uses it: When a "payment.captured" webhook arrives, it easily
      // looks up this exact paymentOrders row via razorpayOrderId to trace it back to the user.
      await db.insert(paymentOrders).values({
        userId: userId,
        amount: Math.round(amount * 100), // convert rupees to paise as per schema
        razorpayOrderId: order.id,
        status: "pending",
      });

      // 2. Backward compatibility: continue logging in the general transactions table
      await db.insert(transactions).values({
        userId: userId,
        walletId: walletId,
        txnRef: order.id, // Store order ID as reference
        amount: amount.toString(),
        type: "deposit",
        status: "pending",
        note: "Order created, waiting for payment",
      });
      console.log(`Transaction & PaymentOrder logged for order: ${order.id}`);
    } catch (dbError: any) {
      console.error("Database Insertion Error (create order):", dbError.message);
      // We still return the order to the frontend, but log the failure
    }


    res.status(200).json(order);
  } catch (error) {
    console.error("Razorpay Order Error:", error);
    res.status(500).json({ error: "Failed to create Razorpay order" });
  }
};

/**
 * @swagger
 * /api/payments/verify:
 *   post:
 *     summary: Verify payment, update transaction status, and create ticket
 *     tags: [Payments]
 */
export const verifyRazorpayPayment = async (req: Request, res: Response) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      userId,
      amount,
      drawId,
      ticketNumber,
      pickedNumbers,
      walletId
    } = req.body;

    // [DEBUG]: Log incoming verification data
    console.log("Verifying Payment - Request Body:", req.body);

    // 1. Signature Verification
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(body.toString())
      .digest("hex");

    const isSignatureValid = expectedSignature === razorpay_signature;

    if (!isSignatureValid) {
      console.error("Signature verification failed for order:", razorpay_order_id);
      await db.update(transactions)
        .set({ status: "failed", note: "Signature verification failed" })
        .where(eq(transactions.txnRef, razorpay_order_id));
      return res.status(400).json({ error: "Invalid payment signature" });
    }

    console.log("Signature valid. Implementing instant fulfillment...");

    // 2. Fulfillment Logic (Mirroring Webhook for immediate UI feedback)
    try {
      await db.transaction(async (tx) => {
        // [0] Idempotency Check
        const existingOrder = await tx.select().from(paymentOrders).where(eq(paymentOrders.razorpayOrderId, razorpay_order_id));
        if (existingOrder.length > 0 && existingOrder[0].status === "success") {
          console.log(`[Verify] Order ${razorpay_order_id} already marked success (Idempotency).`);
          return;
        }

        // [A] Update payment_orders
        await tx.update(paymentOrders)
          .set({ status: "success" })
          .where(eq(paymentOrders.razorpayOrderId, razorpay_order_id));

        // [B] Update Transactions
        await tx.update(transactions)
          .set({
            status: "success",
            gatewayTxnId: razorpay_payment_id,
            note: `Verified: Frontend signature proven — ${razorpay_payment_id}`,
          })
          .where(eq(transactions.txnRef, razorpay_order_id));

        // [C] Credit Wallet
        if (amount && walletId) {
          const userWallets = await tx.select().from(wallets).where(eq(wallets.id, walletId));
          if (userWallets.length > 0) {
            const currentBalance = Number(userWallets[0].balance) || 0;
            const newBalance = currentBalance + Number(amount);
            
            await tx.update(wallets)
              .set({
                balance: newBalance.toFixed(2),
                updatedAt: new Date(),
              })
              .where(eq(wallets.id, walletId));
            
            console.log(`[Verify Success] Wallet ${walletId} credited ₹${Number(amount)}`);
          }
        }
      });

      return res.status(200).json({
        success: true,
        message: "Payment verified and wallet updated successfully."
      });
    } catch (fulfillmentError: any) {
      console.error("Fulfillment Error (DB):", fulfillmentError.message);
      // Even if DB fails, signature was valid. Returns 200 so UI doesn't panic; 
      // Webhook will retry background fulfillment.
      return res.status(200).json({
        success: true,
        message: "Signature verified. Webhook will handle final balance update."
      });
    }
  } catch (error) {
    console.error("Payment Verification Error:", error);
    res.status(500).json({ error: "Internal server error during verification" });
  }
};

/* 
UPDATED FRONTEND CODE (React/JS):
 
const handleBuyTicket = async (ticketData) => {
   // 1. Backend creates order & pending txn
   const orderRes = await axios.post('/api/payments/create-order', { 
     amount: ticketData.price, 
     userId: user.id,
     walletId: user.walletId 
   });
   
   const options = {
     key: "...", 
     order_id: orderRes.data.id,
     handler: async (payment) => {
       // 2. Backend updates txn to success & creates ticket entry
       await axios.post('/api/payments/verify', {
         ...payment,
         ...ticketData, // includes drawId, ticketNumber, pickedNumbers
         userId: user.id,
         walletId: user.walletId
       });
       alert("Ticket Purchased Successfully!");
     },
     // ... other config
   };
   new window.Razorpay(options).open();
};
*/


/**
 * @swagger
 * /api/payments/stats:
 *   get:
 *     summary: Get payment dashboard statistics
 *     description: Returns aggregated financial data for the admin dashboard.
 *     tags:
 *       - Payments
 *     responses:
 *       200:
 *         description: Successfully retrieved statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalRevenue:
 *                   type: number
 *                 totalDeposits:
 *                   type: number
 *                 totalWithdrawals:
 *                   type: number
 *                 totalPending:
 *                   type: number
 */

/**
 * Controller: getPaymentStats
 * 
 * PURPOSE:
 * This endpoint calculates the key financial metrics for the admin "Payments" dashboard.
 * 
 * TABLES QUERIED:
 * - `transactions`: This is the primary table used for aggregation. It contains all financial movements.
 * 
 * LOGIC:
 * 1. Total Revenue: Sum of all successful transactions where type is 'ticket_purchase'.
 *    - Formula: SUM(amount) WHERE type = 'ticket_purchase' AND status = 'success'
 * 2. Total Deposits: Sum of all successful user deposits.
 *    - Formula: SUM(amount) WHERE type = 'deposit' AND status = 'success'
 * 3. Total Withdrawals: Sum of all successful withdrawal requests.
 *    - Formula: SUM(amount) WHERE type = 'withdrawal' AND status = 'success'
 * 4. Pending Amount: Sum of all transactions currently in 'pending' status.
 *    - Formula: SUM(amount) WHERE status = 'pending'
 * 
 * IMPLEMENTATION:
 * We use Drizzle's `sql` helper to perform these aggregations in a single database round-trip for efficiency.
 */
export const getPaymentStats = async (req: Request, res: Response) => {
  try {
    const stats = await db.select({
      // Aggregating Revenue: Total money earned from lottery ticket sales
      totalRevenue: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'ticket_purchase' AND ${transactions.status} = 'success' THEN ${transactions.amount}::numeric ELSE 0 END), 0)`,

      // Aggregating Deposits: Total money added to user wallets
      totalDeposits: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'deposit' AND ${transactions.status} = 'success' THEN ${transactions.amount}::numeric ELSE 0 END), 0)`,

      // Aggregating Withdrawals: Total money paid out to users
      totalWithdrawals: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'withdrawal' AND ${transactions.status} = 'success' THEN ${transactions.amount}::numeric ELSE 0 END), 0)`,

      // Aggregating Pending: Money tied up in incomplete transactions (e.g., pending withdrawals)
      totalPending: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.status} = 'pending' THEN ${transactions.amount}::numeric ELSE 0 END), 0)`,
    }).from(transactions);

    res.status(200).json(stats[0]);
  } catch (error) {
    console.error("Error fetching payment stats:", error);
    res.status(500).json({ error: "Failed to fetch payment statistics" });
  }
};

/**
 * @swagger
 * /api/admin/payments/transactions:
 *   get:
 *     summary: Get all system transactions (Admin Only)
 *     description: Returns a comprehensive list of all transactions joined with user details and payment methods.
 *     tags:
 *       - Admin Payments
 *     responses:
 *       200:
 *         description: Successfully retrieved transactions
 */
export const getAdminTransactions = async (req: Request, res: Response) => {
  try {
    // 1. Fetch transactions with user name and payment method name
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

    // 2. Mapping enums to human-readable strings as requested
    const typeMapping: Record<string, string> = {
      deposit: 'Deposit',
      withdrawal: 'Withdrawal',
      ticket_purchase: 'TicketPurchase',
      prize_payout: 'PrizePayout',
      bonus_credit: 'BonusCredit',
      referral_reward: 'ReferralReward',
      manual_adjustment: 'ManualAdjustment',
    };

    const statusMapping: Record<string, string> = {
      pending: 'Pending',
      success: 'Success',
      failed: 'Failed',
      refunded: 'Refunded',
    };

    // 3. Format the data for the frontend
    const formattedData = data.map((txn) => ({
      id: txn.id,
      userName: txn.userName || 'Unknown User',
      amount: txn.amount,
      type: typeMapping[txn.type as string] || txn.type,
      status: statusMapping[txn.status as string] || txn.status,
      method: txn.method || 'Wallet/Gateway',
      datetime: txn.datetime,
    }));

    res.status(200).json({
      success: true,
      data: formattedData,
    });
  } catch (error: any) {
    console.error("Error fetching admin transactions:", error.message);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch transactions" 
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// WEBHOOK HANDLER
// Route: POST /api/payments/webhook
//
// PURPOSE:
//   Razorpay sends server-to-server POST requests to this endpoint whenever a
//   payment event occurs (capture, failure, refund, etc.).
//   This handler processes the "payment.captured" event to:
//     1. Verify the request genuinely came from Razorpay (HMAC SHA256 signature)
//     2. Find the pending transaction using the razorpay_order_id stored as txnRef
//     3. Guard against duplicate processing (idempotency check)
//     4. Update the transaction status to "success"
//     5. Credit the user's wallet balance
//
// IMPORTANT — BODY PARSING:
//   Razorpay requires the RAW (un-parsed) request body to verify the HMAC
//   signature. This route is registered BEFORE app.use(express.json()) in
//   src/index.ts, using express.raw({ type: "application/json" }), so req.body
//   here is a Buffer, not a parsed object.
//
// DO NOT:
//   - Create tickets here (ticket creation belongs to /verify which the frontend calls)
//   - Modify the existing createRazorpayOrder or verifyRazorpayPayment functions
// ─────────────────────────────────────────────────────────────────────────────

export const handleRazorpayWebhook = async (req: Request, res: Response) => {
  // ── Step 1: Log arrival ─────────────────────────────────────────────────
  // Every webhook hit should appear in logs so we can trace Razorpay callbacks.
  console.log("[Webhook] Received Razorpay webhook request");

  // ── Step 2: Extract the Razorpay signature header ───────────────────────
  // Razorpay attaches X-Razorpay-Signature to every webhook POST.
  // Absence of the header means the request did not come from Razorpay.
  const razorpaySignature = req.headers["x-razorpay-signature"] as string;

  if (!razorpaySignature) {
    console.error("[Webhook] Missing X-Razorpay-Signature header — rejected");
    return res.status(400).json({ error: "Missing signature header" });
  }

  // ── Step 3: Get the pristine raw Buffer body ───────────────────────────
  // Captured securely in index.ts via express.json({ verify: ... })
  const rawBody = (req as any).rawBody as Buffer;

  if (!rawBody || rawBody.length === 0) {
    console.error("[Webhook] Empty or missing raw request body — rejected");
    return res.status(400).json({ error: "Empty request body" });
  }

  // ── Step 4: Verify HMAC SHA256 signature ────────────────────────────────
  // Razorpay signs the raw body with the Webhook Secret configured in:
  //   Razorpay Dashboard → Settings → Webhooks → [your webhook] → Secret
  // Store that secret in .env as RAZORPAY_WEBHOOK_SECRET.
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "";

  if (!webhookSecret) {
    // Misconfiguration — return 500 so Razorpay retries after env var is set
    console.error("[Webhook] RAZORPAY_WEBHOOK_SECRET env var is not set!");
    return res.status(500).json({ error: "Webhook secret not configured" });
  }

  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody) // ← must be the raw Buffer, NOT JSON.stringify(parsedBody)
    .digest("hex");

  if (expectedSignature !== razorpaySignature) {
    // Signature mismatch → request is forged or tampered → hard reject
    console.error("[Webhook] Signature mismatch — possible forged request");
    console.error(`[Webhook] Expected: ${expectedSignature}`);
    console.error(`[Webhook] Received: ${razorpaySignature}`);
    return res.status(400).json({ error: "Invalid webhook signature" });
  }

  console.log("[Webhook] Signature verified ✅");

  // ── Step 5: Parse the (now trusted) JSON payload ────────────────────────
  let payload: any;
  try {
    payload = JSON.parse(rawBody.toString("utf8"));
  } catch (parseError) {
    console.error("[Webhook] Failed to parse JSON payload:", parseError);
    return res.status(400).json({ error: "Invalid JSON payload" });
  }

  const eventType: string = payload?.event;
  console.log(`[Webhook] Event type: "${eventType}"`);

  // ── Step 6: Route on event type ─────────────────────────────────────────
  // Only "payment.captured" mutates data. All other events are acknowledged
  // with 200 and skipped — Razorpay requires 200 for events we don't act on,
  // otherwise it keeps retrying.
  if (eventType !== "payment.captured") {
    console.log(`[Webhook] Event "${eventType}" not handled — acknowledging without action`);
    return res.status(200).json({ message: "Event acknowledged, not processed" });
  }

  // ── Step 7: Extract payment entity from payload ─────────────────────────
  // Razorpay webhook payload shape for payment.captured:
  // {
  //   event: "payment.captured",
  //   payload: { payment: { entity: { id, order_id, amount, ... } } }
  // }
  const paymentEntity = payload?.payload?.payment?.entity;

  if (!paymentEntity) {
    console.error("[Webhook] payment.entity missing in payload — malformed");
    return res.status(400).json({ error: "Malformed webhook payload" });
  }

  const {
    id: razorpayPaymentId,    // "pay_xxx" — Razorpay payment ID
    order_id: razorpayOrderId, // "order_xxx" — the order we created; stored as txnRef
    amount: amountInPaise,    // integer, paise (e.g. 50000 = ₹500)
  } = paymentEntity;

  console.log(`[Webhook] Captured — order: ${razorpayOrderId}, payment: ${razorpayPaymentId}, amount: ${amountInPaise} paise`);

  if (!razorpayOrderId) {
    console.error("[Webhook] order_id missing from payment entity");
    return res.status(400).json({ error: "order_id not found in payload" });
  }

  // ── Step 8: Find payment_orders using razorpay_order_id ────────────────
  const existingOrders = await db
    .select()
    .from(paymentOrders)
    .where(eq(paymentOrders.razorpayOrderId, razorpayOrderId));

  // If NOT found -> log and return
  if (existingOrders.length === 0) {
    console.warn(`[Webhook] No payment_order found for razorpay_order_id: ${razorpayOrderId} — skipping`);
    return res.status(200).json({ message: "Payment order not found — skipped" });
  }

  const pOrder = existingOrders[0];

  // ── Step 9: If status already "success" → return early (prevent duplicate)
  if (pOrder.status === "success") {
    console.log(`[Webhook] Payment order ${pOrder.id} already "success" — duplicate webhook ignored`);
    return res.status(200).json({ message: "Already processed — no-op" });
  }

  // Find transaction using txnRef for backward compatibility
  const existingTxns = await db
    .select()
    .from(transactions)
    .where(eq(transactions.txnRef, razorpayOrderId));

  if (existingTxns.length === 0) {
    console.warn(`[Webhook] No backward-compatible transaction found for order: ${razorpayOrderId} — skipping`);
    return res.status(200).json({ message: "Transaction not found — skipped" });
  }

  const txn = existingTxns[0];
  console.log(`[Webhook] Found both payment_order ${pOrder.id} and transaction ${txn.id}`);

  // ── Step 10: Atomically update DB state ───────────────
  try {
    await db.transaction(async (tx) => {

      // Update payment_orders.status = "success"
      await tx
        .update(paymentOrders)
        .set({ status: "success" })
        .where(eq(paymentOrders.razorpayOrderId, razorpayOrderId));

      console.log(`[Webhook] payment_order ${pOrder.id} updated to "success"`);

      // Update transaction.status = "success"
      // (This serves as the required "transaction record (type: deposit)" resolution)
      await tx
        .update(transactions)
        .set({
          status: "success",
          gatewayTxnId: razorpayPaymentId, // "pay_xxx"
          note: `Webhook: payment.captured — ${razorpayPaymentId}`,
        })
        .where(eq(transactions.txnRef, razorpayOrderId));

      console.log(`[Webhook] Transaction ${txn.id} updated to "success"`);

      // Update wallet balance: wallet.balance += amount
      // Razorpay sends amount in paise — convert to INR rupees (÷100)
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
    // Return 500 so Razorpay automatically retries — the idempotency guard
    // above means a retry is safe even after a partial success.
    console.error("[Webhook] DB transaction failed:", dbError.message);
    return res.status(500).json({ error: "Database error processing webhook" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// REUSABLE UTILITY: updateWalletBalance
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Helper to safely update a user's wallet balance and securely log the ledger transaction.
 * Completely reusable across webhooks, game joining, and withdrawals.
 * 
 * @param userId - UUID of the user
 * @param amount - Amount to add (positive) or deduct (negative)
 * @param type - The transaction categorization type
 * @returns Object with success status and relevant messages/errors
 */
export const updateWalletBalance = async (
  userId: string,
  amount: number,
  type: "deposit" | "withdrawal" | "ticket_purchase" | "prize_payout" | "bonus_credit" | "referral_reward" | "manual_adjustment"
) => {
  try {
    // Utilize Drizzle's db.transaction to ensure operations are atomic (either both succeed or both fail)
    return await db.transaction(async (tx) => {
      
      // 1. Fetch the user's wallet aggressively inside the transaction.
      // We need the wallet ID for the transaction log and current balance for validation.
      const userWallets = await tx
        .select()
        .from(wallets)  
        .where(eq(wallets.userId, userId));

      if (userWallets.length === 0) {
        throw new Error("Wallet not found for the provided user.");
      }

      const wallet = userWallets[0];
      const currentBalance = Number(wallet.balance) || 0;
      const newBalance = currentBalance + amount;

      // 2. Prevent negative balance.
      // If the operation is a deduction (negative amount) and dropping below zero, abort entirely.
      if (newBalance < 0) {
        throw new Error("Insufficient wallet balance to perform this operation.");
      }

      // 3. Update the wallet balance securely.
      // Formats the output safely to 2 decimal places to comply with the numeric database schema.
      await tx
        .update(wallets)
        .set({
          balance: newBalance.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(wallets.id, wallet.id));

      // 4. Insert the authoritative transaction ledger record.
      // Generates a unique internal txnRef. Storing absolute amounts protects logic upstream.
      const internalTxnRef = `txn_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

      await tx.insert(transactions).values({
        userId: userId,
        walletId: wallet.id,
        txnRef: internalTxnRef,
        amount: Math.abs(amount).toString(), 
        type: type,
        status: "success", // Immediately resolved because this is an internal database action
        note: `Internal wallet update: ${type}`,
      });

      return { success: true, message: "Wallet balance securely updated." };
    });
  } catch (error: any) {
    console.error("[Wallet Utility] Failed to update balance:", error.message);
    return { success: false, error: error.message };
  }
};
