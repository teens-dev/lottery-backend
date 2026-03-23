
import { Router } from "express";
import {
  getWalletBalance,
  depositWallet,
  getTransactions,
  payTicket,
} from "../controllers/wallet.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Wallet
 *   description: Wallet management APIs
 */

/**
 * @swagger
 * /api/wallet/balance:
 *   get:
 *     summary: Get wallet balance
 *     tags: [Wallet]
 *     parameters:
 *       - in: header
 *         name: userid
 *         schema:
 *           type: string
 *         required: true
 *         description: User ID
 *         example: f6d0c61e-1882-4264-8e7a-36736a994300
 *     responses:
 *       200:
 *         description: Wallet balance fetched successfully
 */
router.get("/balance", authMiddleware, getWalletBalance);

/**F
 * @swagger
 * /api/wallet/deposit:
 *   post:
 *     summary: Deposit money to wallet
 *     tags: [Wallet]
 *     parameters:
 *       - in: header
 *         name: userid
 *         schema:
 *           type: string
 *         required: true
 *         description: User ID
 *         example: f6d0c61e-1882-4264-8e7a-36736a994300
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *                 example: 500
 *               method_id:
 *                 type: number
 *                 example: 1
 *     responses:
 *       200:
 *         description: Deposit successful
 */
router.post("/deposit", authMiddleware, depositWallet);

/**
 * @swagger
 * /api/wallet/transactions:
 *   get:
 *     summary: Get wallet transaction history
 *     tags: [Wallet]
 *     parameters:
 *       - in: header
 *         name: userid
 *         schema:
 *           type: string
 *         required: true
 *         description: User ID
 *         example: f6d0c61e-1882-4264-8e7a-36736a994300
 *     responses:
 *       200:
 *         description: Wallet transactions list
 */
router.get("/transactions", authMiddleware, getTransactions);

/**
 * @swagger
 * /api/wallet/pay-ticket:
 *   post:
 *     summary: Pay ticket using wallet
 *     tags: [Wallet]
 *     parameters:
 *       - in: header
 *         name: userid
 *         schema:
 *           type: string
 *         required: true
 *         description: User ID
 *         example: f6d0c61e-1882-4264-8e7a-36736a994300
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *                 example: 100
 *     responses:
 *       200:
 *         description: Ticket purchased successfully
 */
router.post("/pay-ticket", authMiddleware, payTicket);

export default router;

