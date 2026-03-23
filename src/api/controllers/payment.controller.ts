import { Request, Response } from "express";
import { db } from "../../db/db";
import { transactions, wallets, tickets } from "../../db/schema";
import { sql, eq, and } from "drizzle-orm";
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
      await db.insert(transactions).values({
        userId: userId,
        walletId: walletId,
        txnRef: order.id, // Store order ID as reference
        amount: amount.toString(),
        type: "deposit",
        status: "pending",
        note: "Order created, waiting for payment",
      });
      console.log(`Transaction logged for order: ${order.id}`);
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

    // [DEBUG]: Starting transaction recording
    console.log("Signature valid. Recording success in DB...");

    try {
      // Atomic Transaction for Success (Update Txn + Create Ticket)
      await db.transaction(async (tx) => {
        // Update transaction to success
        await tx.update(transactions)
          .set({
            status: "success",
            gatewayTxnId: razorpay_payment_id,
            note: "Payment Success - Ticket Issued"
          })
          .where(eq(transactions.txnRef, razorpay_order_id));

        // Create the ticket record
        await tx.insert(tickets).values({
          userId: userId,
          drawId: drawId,
          ticketNumber: ticketNumber,
          pricePaid: amount.toString(),
          pickedNumbers: pickedNumbers,
          status: "active",
        });
      });
      console.log("Payment and ticket successfully recorded in DB.");
      res.status(200).json({ message: "Payment Success & Ticket Created" });
    } catch (txnError: any) {
      console.error("Database Transaction Error (verify):", txnError.message);
      res.status(500).json({ error: "Database error during payment verification" });
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
