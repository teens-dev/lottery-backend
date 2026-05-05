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
  payWithWallet,
  getUsersWithWallet
} from "../controllers/wallet.controller";

const router = express.Router();

router.get("/wallets", getAllWallets);
router.get("/wallet", getUserWallet);
router.get("/transactions", getUserTransactions);
router.post("/pay", payWithWallet);

// 👉 IMPORTANT LINE
router.get("/users-wallets", getUsersWithWallet);

export default router;