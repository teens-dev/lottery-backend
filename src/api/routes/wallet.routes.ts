import { Router } from "express";
import {
  getWalletBalance,
  depositWallet,
  getTransactions,
  payTicket,
} from "../controllers/wallet.controller";

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
 *       - in: query
 *         name: userId
 *         required: false
 *         schema:
 *           type: string
 *         example: a9824974-b278-4c38-a383-188622ddf7a9
 *         description: Pass userId for testing
 *     responses:
 *       200:
 *         description: Wallet balance fetched successfully
 */
router.get("/balance", getWalletBalance);


/**
 * @swagger
 * /api/wallet/deposit:
 *   post:
 *     summary: Deposit money to wallet
 *     tags: [Wallet]
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: false
 *         schema:
 *           type: string
 *         example: a9824974-b278-4c38-a383-188622ddf7a9
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
router.post("/deposit", depositWallet);


/**
 * @swagger
 * /api/wallet/transactions:
 *   get:
 *     summary: Get wallet transaction history
 *     tags: [Wallet]
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: false
 *         schema:
 *           type: string
 *         example: a9824974-b278-4c38-a383-188622ddf7a9
 *     responses:
 *       200:
 *         description: Wallet transactions list
 */
router.get("/transactions", getTransactions);


/**
 * @swagger
 * /api/wallet/pay-ticket:
 *   post:
 *     summary: Pay ticket using wallet
 *     tags: [Wallet]
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: false
 *         schema:
 *           type: string
 *         example: a9824974-b278-4c38-a383-188622ddf7a9
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
router.post("/pay-ticket", payTicket);

export default router;