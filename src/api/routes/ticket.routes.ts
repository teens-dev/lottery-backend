import { Router } from "express";
import {
  getTickets,
  getTicketCount,
  getMyTickets,
  getBookedNumbersForDraw,
} from "../controllers/ticket.controller";

import { protect } from "../middleware/auth.middleware";

const router = Router();

router.get("/", getTickets);
router.get("/count", getTicketCount);
router.get("/draw/:drawId/booked", getBookedNumbersForDraw);
// ✅ FORCE TEST ROUTE
router.get("/my", protect, (req, res, next) => {
  console.log("🔥 /api/tickets/my HIT");
  next();
}, getMyTickets);

export default router;