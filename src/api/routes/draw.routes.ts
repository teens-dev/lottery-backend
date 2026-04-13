import { Router } from "express";
import { createDraw, getAllDraws, getDrawTickets, declareResult, getDrawResults } from "../controllers/draw.controller";
import { protect } from "../middleware/auth.middleware";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Draws
 *   description: Lottery draw management
 */

router.post("/create-draw", createDraw);
router.get("/draws", getAllDraws);
router.get("/draws/:id/tickets", getDrawTickets);

// Results
router.get("/draw-results", getDrawResults);          // Public
router.post("/draw-results", protect, declareResult); // Admin only

export default router;