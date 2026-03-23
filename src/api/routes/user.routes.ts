import { Router } from "express";
import { getUsersWithCount } from "../controllers/user.controller";

const router = Router();




router.get("/", getUsersWithCount);
import { getUsers } from "../controllers/user.controller";


router.get("/users", getUsers);

export default router;