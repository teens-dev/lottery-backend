import { Router } from "express";
import { createDraw, getAllDraws } from "../controllers/draw.controller";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Draws
 *   description: Lottery draw management
 */

router.post("/create-draw", createDraw);
router.get("/draws", getAllDraws);

export default router;