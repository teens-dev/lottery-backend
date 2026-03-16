import { Request, Response } from "express";
import { db } from "../../db";
import { transactions } from "../../db/schema/dependent";
import { sql, eq, and } from "drizzle-orm";

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
