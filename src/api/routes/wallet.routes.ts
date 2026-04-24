// import express from "express";
// import {
//   getAllWallets,
//   getUserWallet,
//   getUserTransactions,
//   payWithWallet
// } from "../controllers/wallet.controller";

// import { protect } from "../middleware/auth.middleware";
// import { adminOnly } from "../middleware/admin.middleware";

// const router = express.Router();

// // ADMIN
// router.get("/admin/all", protect, adminOnly, getAllWallets);

// // USER WALLET
// router.get("/", protect, getUserWallet);
// router.post("/pay", protect, payWithWallet);

// // USER TRANSACTIONS
// router.get("/transactions", protect, getUserTransactions);

// export default router;

import express from "express";
import {
  getAllWallets,
  getUserWallet,
  getUserTransactions,
  payWithWallet
} from "../controllers/wallet.controller";

const router = express.Router();

// ✅ TEST FIRST (no auth)
router.get("/wallets", getAllWallets);

// USER
router.get("/wallet", getUserWallet);
router.post("/wallet/pay", payWithWallet);

// TRANSACTIONS
router.get("/wallet/transactions", getUserTransactions);

export default router;