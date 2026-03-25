import type { Request, Response } from "express";
import { db } from "../../db/index";
import { transactions } from "../../db/schema/index";
import { sql } from "drizzle-orm";



export const getTotalRevenue = async (req: Request, res: Response) => {
  try {
    const [result] = await db
      .select({
        ticket_purchase: sql<number>`
          COALESCE(SUM(CASE 
            WHEN ${transactions.type} = 'ticket_purchase' 
                 AND ${transactions.status} = 'success' 
            THEN ${transactions.amount} 
            ELSE 0 END), 0)
        `,

        refunds: sql<number>`
          COALESCE(SUM(CASE 
            WHEN ${transactions.type} = 'ticket_purchase' 
                 AND ${transactions.status} = 'refunded' 
            THEN ${transactions.amount} 
            ELSE 0 END), 0)
        `,

        prize_payout: sql<number>`
          COALESCE(SUM(CASE 
            WHEN ${transactions.type} = 'prize_payout' 
                 AND ${transactions.status} = 'success' 
            THEN ${transactions.amount} 
            ELSE 0 END), 0)
        `,

        bonus_credit: sql<number>`
          COALESCE(SUM(CASE 
            WHEN ${transactions.type} = 'bonus_credit' 
                 AND ${transactions.status} = 'success' 
            THEN ${transactions.amount} 
            ELSE 0 END), 0)
        `,

        referral_reward: sql<number>`
          COALESCE(SUM(CASE 
            WHEN ${transactions.type} = 'referral_reward' 
                 AND ${transactions.status} = 'success' 
            THEN ${transactions.amount} 
            ELSE 0 END), 0)
        `,

        manual_adjustment: sql<number>`
          COALESCE(SUM(CASE 
            WHEN ${transactions.type} = 'manual_adjustment' 
                 AND ${transactions.status} = 'success' 
            THEN ${transactions.amount} 
            ELSE 0 END), 0)
        `,

        deposit: sql<number>`
          COALESCE(SUM(CASE 
            WHEN ${transactions.type} = 'deposit' 
                 AND ${transactions.status} = 'success' 
            THEN ${transactions.amount} 
            ELSE 0 END), 0)
        `,

        withdrawal: sql<number>`
          COALESCE(SUM(CASE 
            WHEN ${transactions.type} = 'withdrawal' 
                 AND ${transactions.status} = 'success' 
            THEN ${transactions.amount} 
            ELSE 0 END), 0)
        `
      })
      .from(transactions);

    // ✅ Final Revenue Calculation (Explicit & Auditable)
    const revenue =
      result.ticket_purchase
      - result.refunds
      - result.prize_payout
      - result.bonus_credit
      - result.referral_reward
      + result.manual_adjustment;

    res.json({
      success: true,
      revenue,
      breakdown: result // 👈 helpful for audits/debugging
    });

  } catch (error) {
    console.error("Revenue endpoint error:", error);
    res.status(500).json({
      success: false,
      message: "Error calculating revenue",
      error: error instanceof Error ? error.message : String(error)
    });
  }
};