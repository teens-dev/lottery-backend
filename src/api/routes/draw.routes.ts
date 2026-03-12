import { Router } from "express";
import { getDraws } from "../controllers/draw.controller";

const router = Router();

router.get("/draws", getDraws);

export default router;