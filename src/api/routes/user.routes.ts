import { Router } from "express";
import { getUsersWithCount, getUsers } from "../controllers/user.controller";

const router = Router();

router.get("/", getUsersWithCount);
router.get("/users", getUsers);

export default router;