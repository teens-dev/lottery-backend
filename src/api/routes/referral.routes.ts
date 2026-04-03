import express from "express";
import { generateReferral } from "../controllers/referral.controller";
import { protect } from "../middleware/user.middleware"

const router = express.Router();

// Only logged in user can generate referral
router.post("/generate", protect, generateReferral);

export default router;