import express from "express";
import { getAllWallets, requestWithdrawal, approveWithdrawal } from "../controllers/wallet.controller";

const router = express.Router();

// ✅ GET ALL WALLETS (ADMIN)
router.get("/admin/wallets", getAllWallets);

// ✅ WITHDRAWAL SYSTEM
router.post("/withdraw", requestWithdrawal);
router.post("/admin/approve-withdraw", approveWithdrawal);

export default router;
