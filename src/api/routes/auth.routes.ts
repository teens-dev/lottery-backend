import express from "express";
import {
  register,
  login,
  profile,
  logout,
  updateProfile,
  getAllUsers   // ✅ added here
} from "../controllers/auth.controller";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/profile", profile);
router.post("/logout", logout);
router.put("/update", updateProfile);

// ✅ NEW ROUTE (must be BEFORE export)
router.get("/users", getAllUsers);

export default router;