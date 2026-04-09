import express from "express";
import { 
  getAllWallets,
  getUserWallet,
  getUserTransactions
} from "../controllers/wallet.controller";

import { protect } from "../middleware/admin.middleware";

const router = express.Router();

// ADMIN
router.get("/admin/wallets", getAllWallets);

// USER WALLET
router.get("/wallet", protect, getUserWallet);

// USER TRANSACTIONS
router.get("/wallet/transactions", protect, getUserTransactions);

export default router;

