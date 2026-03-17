import { Router } from "express";
import {
  createAdmin,
  createAdminRole,
  adminLogin,
  getAdminProfile,
} from "../controllers/admin.controller";
import { protect } from "../middleware/auth.middleware";
import { adminOnly } from "../middleware/admin.middleware";

const router = Router();

// create routes for Postman
router.post("/roles", createAdminRole);
router.post("/create", createAdmin);

// login route
router.post("/login", adminLogin);





// protected route
router.get("/me", protect, adminOnly, getAdminProfile);

export default router;