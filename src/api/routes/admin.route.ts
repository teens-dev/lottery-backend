import express from "express";
import {
  adminLogin,
  createAdmin,
  createAdminRole,
  getAdminProfile,
} from "../controllers/admin.controller";
import { protect } from "../middleware/auth.middleware";
import { adminOnly } from "../middleware/admin.middleware";

const router = express.Router();

/* PUBLIC */
router.post("/admin-login", adminLogin);

/* PROTECTED ADMIN ROUTES */
router.post("/roles", protect, adminOnly, createAdminRole);
router.post("/create", createAdmin);
router.get("/me", protect, adminOnly, getAdminProfile);

export default router;