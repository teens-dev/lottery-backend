import { Request, Response } from "express";
import { db } from "../../db";
import { tickets } from "../../db/schema";

import { eq, ilike, and, or, desc } from "drizzle-orm";

// ✅ GET Tickets
export const getTickets = async (req: Request, res: Response) => {
  try {
    const {
      search,
      status,
      user_id,
      draw_id,
      page = "1",
      limit = "1000",
    } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const offset = (pageNum - 1) * limitNum;

    const filters = [];

    // 🔍 Search (ticket_number + picked_numbers)
    if (search) {
      filters.push(
        or(
          ilike(tickets.ticketNumber, `%${search}%`),
          ilike(tickets.pickedNumbers, `%${search}%`)
        )
      );
    }

    // 🎯 Filters
    if (status) {
      filters.push(eq(tickets.status, status as any));
    }

    if (user_id) {
      filters.push(eq(tickets.userId, user_id as string));
    }

    if (draw_id) {
      filters.push(eq(tickets.drawId, draw_id as string));
    }

    // 📦 Query
    const data = await db
      .select({
        id: tickets.id,
        ticket_number: tickets.ticketNumber,
        user_id: tickets.userId,
        draw_id: tickets.drawId,
        price_paid: tickets.pricePaid,
        picked_numbers: tickets.pickedNumbers,
        numbers_array: tickets.pickedNumbers,
        is_auto_pick: tickets.isAutoPick,
        status: tickets.status,
        is_winner: tickets.isWinner,
        purchased_at: tickets.purchasedAt,
      })
      .from(tickets)
      .where(filters.length ? and(...filters) : undefined)
      // .orderBy(desc(tickets.purchasedAt))
      // .limit(limitNum)
      // .offset(offset);
      .orderBy(desc(tickets.purchasedAt));

    const total = await db.$count(tickets);

    return res.json({
      success: true,
      count: total,
      data,
    });

  } catch (error) {
    console.error("GET TICKETS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch tickets",
    });
  }
};

// ✅ COUNT API (for dashboard)
export const getTicketCount = async (_req: Request, res: Response) => {
  try {
    const total = await db.$count(tickets);

    return res.json({
      success: true,
      count: total,
    });

  } catch (error) {
    console.error("COUNT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch count",
    });
  }
};