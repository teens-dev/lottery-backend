import { Router } from "express";
import { createDraw, getAllDraws, getDrawTickets } from "../controllers/draw.controller";

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

export default router;