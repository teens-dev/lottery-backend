import { Router } from "express";
import {
  getTickets,
  getTicketCount,
} from "../controllers/ticket.controller";

const router = Router();

router.get("/", getTickets);
router.get("/count", getTicketCount);

export default router;