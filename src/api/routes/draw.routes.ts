import { Router } from "express";
import { createDraw } from "../controllers/draw.controller";

const router = Router();

router.post("/create-draw", createDraw);







export default router;