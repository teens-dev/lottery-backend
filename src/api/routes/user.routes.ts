import { Router } from "express";
import { getUsersWithCount } from "../controllers/user.controller";

const router = Router();



// ✅ ONLY ONE API
router.get("/", getUsersWithCount);

export default router;