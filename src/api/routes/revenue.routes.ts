import { Router } from "express";
import { getTotalRevenue } from "../controllers/revenue.controller";



const router = Router();

router.get("/", getTotalRevenue);

export default router;