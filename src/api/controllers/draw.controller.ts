import { Request, Response } from "express";
import { db } from "../../db/index";
import { draws, gameTypes, tickets } from "../../db/schema";
import { eq, desc, SQL } from "drizzle-orm";
import { drawStatusEnum } from "../../db/schema";
import { sendEmail } from "../utils/mailer";
import { getAllAdminEmails } from "../utils/getAdmins";
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
      // 🔔 Send email to admins (non-blocking)
 try {
      const adminEmails = await getAllAdminEmails();

      console.log("📧 Admin Emails:", adminEmails);

      if (adminEmails.length > 0) {
        await sendEmail(
          adminEmails,
          "🎰 New Draw Created",
          `
            <h2>New Draw Created</h2>
            <p><b>Name:</b> ${name}</p>
            <p><b>Prize Pool:</b> ${prize_pool}</p>
            <p><b>Draw Date:</b> ${draw_date}</p>
          `
        );

        console.log("✅ Email sent successfully");
      } else {
        console.log("⚠️ No admin emails found");
      }

    } catch (emailError) {
      console.error("❌ Email error:", emailError);
    }

    // ✅ SUCCESS RESPONSE
    return res.status(201).json({
      success: true,
      data: newDraw
    });

  } catch (error) {
    console.error("❌ Create draw error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create draw"
    });
  }
};

/**
 * @swagger
 * /api/draws:
 *   get:
 *     summary: Get all draws
 *     description: Returns a paginated list of all lottery draws with their game type details. Supports optional filtering by draw status.
 *     tags:
 *       - Draws
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, scheduled, live, completed, cancelled]
 *         description: Filter draws by status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of draws per page
 *     responses:
 *       200:
 *         description: Draws fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Draw'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       500:
 *         description: Server error
 */
export const getAllDraws = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
    const offset = (page - 1) * limit;
    const statusFilter = req.query.status as string | undefined;

    // Validate status if provided
    const validStatuses = ["draft", "scheduled", "live", "completed", "cancelled"];
    if (statusFilter && !validStatuses.includes(statusFilter)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`
      });
    }

    // Build base query
    const baseQuery = db
      .select({
        id:             draws.id,
        name:           draws.name,
        status:         draws.status,
        prizePool:      draws.prizePool,
        ticketPrice:    draws.ticketPrice,
        maxEntries:     draws.maxEntries,
        currentEntries: draws.currentEntries,
        minEntries:     draws.minEntries,
        drawDate:       draws.drawDate,
        drawStartDate:  draws.drawstartDate,
        drawEndDate:    draws.drawendDate,
        description:    draws.description,
        isGuaranteed:   draws.isGuaranteed,
        rngSeedHash:    draws.rngSeedHash,
        createdAt:      draws.createdAt,
        updatedAt:      draws.updatedAt,
        gameTypeId:     draws.gameTypeId,
        gameTypeName:   gameTypes.name,
        gameTypeIcon:   gameTypes.icon,
      })
      .from(draws)
      .leftJoin(gameTypes, eq(draws.gameTypeId, gameTypes.id))
      .orderBy(desc(draws.createdAt));

    // Apply status filter if provided
    const filteredQuery = statusFilter
      ? baseQuery.where(eq(draws.status, statusFilter as typeof drawStatusEnum.enumValues[number]))
      : baseQuery;

    // Fetch data with pagination
    const allDraws = await filteredQuery.limit(limit).offset(offset);

    // Get total count
    const countResult = await db
      .select({ id: draws.id })
      .from(draws)
      .where(statusFilter ? eq(draws.status, statusFilter as typeof drawStatusEnum.enumValues[number]) : undefined);

    const total = countResult.length;
    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      data: allDraws,
      pagination: {
        total,
        page,
        limit,
        totalPages
      }
    });

  } catch (error) {
    console.error("CRITICAL: getAllDraws failed. Detailed error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching draws",
      error: process.env.NODE_ENV === "development" ? (error as Error).message : undefined
    });
  }
};

export const getDrawTickets = async (req: Request, res: Response) => {
  try {
    const drawId = req.params.id as string;
    const allTickets = await db.select({
      ticketNumber: tickets.ticketNumber,
      pickedNumbers: tickets.pickedNumbers,
    }).from(tickets).where(eq(tickets.drawId, drawId));

    const bookedBoxes = allTickets.map(t => t.ticketNumber);

    res.status(200).json({
      success: true,
      data: bookedBoxes,
      pickedNumbers: allTickets.map(t => t.pickedNumbers).filter(Boolean)
    });
  } catch (error) {
    console.error("Error fetching tickets:", error);
    res.status(500).json({ success: false, message: "Error fetching tickets" });
  }
};