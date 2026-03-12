import { Request, Response } from "express";
import { db } from "../../db/db";
import { draws } from "../../db/schema";

/**
 * @swagger
 * /api/create-draw:
 *   post:
 *     summary: Create a new draw
 *     description: Endpoint to create a new lottery draw
 *     tags:
 *       - Draws
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - game_type_id
 *               - created_by
 *               - name
 *               - prize_pool
 *               - ticket_price
 *               - max_entries
 *               - status
 *               - draw_date
 *               - draw_start_date
 *               - draw_end_date
 *               - rng_seed_hash
 *               - is_guaranteed
 *               - min_entries
 *             properties:
 *               game_type_id:
 *                 type: integer
 *               created_by:
 *                 type: string
 *                 format: uuid
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               prize_pool:
 *                 type: number
 *               ticket_price:
 *                 type: number
 *               max_entries:
 *                 type: integer
 *               status:
 *                 type: string
 *               draw_date:
 *                 type: string
 *                 format: date-time
 *               draw_start_date:
 *                 type: string
 *                 format: date-time
 *               draw_end_date:
 *                 type: string
 *                 format: date-time
 *               rng_seed_hash:
 *                 type: string
 *               is_guaranteed:
 *                 type: boolean
 *               min_entries:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Draw created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       400:
 *         description: Invalid input or date format
 *       500:
 *         description: Internal server error
 */
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