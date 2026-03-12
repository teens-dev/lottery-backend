import { Request, Response } from "express";
import { db } from "../../db/db";
import { draws } from "../../db/schema";

export const createDraw = async (req: Request, res: Response) => {

  try {

    console.log("Request body:", req.body);

    const {
      game_type_id,
      created_by,
      name,
      prize_pool,
      ticket_price,
      max_entries,
      status,
      draw_date,
      draw_start_date,
      draw_end_date,
      description,
      rng_seed_hash,
      is_guaranteed,
      min_entries
    } = req.body;

    // Convert string → Date
    const drawDate = new Date(draw_date);
    const drawStartDate = new Date(draw_start_date);
    const drawEndDate = new Date(draw_end_date);

    // Validate dates
    if (
      isNaN(drawDate.getTime()) ||
      isNaN(drawStartDate.getTime()) ||
      isNaN(drawEndDate.getTime())
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format"
      });
    }

    const newDraw = await db
      .insert(draws)
      .values({
        gameTypeId: game_type_id,
        createdBy: created_by,
        name,
        prizePool: prize_pool,
        ticketPrice: ticket_price,
        maxEntries: max_entries,
        status,

        drawDate: drawDate,
        drawstartDate: drawStartDate,
        drawendDate: drawEndDate,

        description,
        rngSeedHash: rng_seed_hash,
        isGuaranteed: is_guaranteed,
        minEntries: min_entries
      })
      .returning();

    res.status(201).json({
      success: true,
      data: newDraw
    });

  } catch (error)
  {

    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to create draw"
    });

  }

};