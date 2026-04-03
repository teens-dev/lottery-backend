import express from "express";
import { getAllWallets } from "../controllers/wallet.controller";

const router = express.Router();

// ✅ SINGLE CLEAN ROUTE
router.get("/admin/wallets", getAllWallets);

export default router;
