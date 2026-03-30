import { Router } from "express";
import {
  getUsers,
  getUsersWithCount,
  getUserById
} from "../controllers/user.controller";

const router = Router();

router.get("/", getUsersWithCount);





// GET /api/users/count
router.get("/", getUsersWithCount);

// GET /api/users
router.get("/users", getUsers);

// GET Single User
router.get("/users/:id", getUserById);

export default router;