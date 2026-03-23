import { Router } from "express";
import { getTotalRevenue } from "../controllers/revenue.controller.ts";
const router = Router();

// Revenue API
router.get("/revenue", getTotalRevenue);



export default router;