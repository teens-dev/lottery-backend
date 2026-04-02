import { Router, raw } from "express";
import { 
  getPaymentStats, 
  createRazorpayOrder, 
  verifyRazorpayPayment,
  handleRazorpayWebhook,
} from "../controllers/payment.controller";

/**
 * Router: Payment Routes
 * 
 * Base path: /api/payments
 */
const router = Router();

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Payment management and statistics
 */

/**
 * POST /api/payments/webhook
 *
 * Razorpay webhook endpoint.
 *
 * CRITICAL: express.raw({ type: "application/json" }) is applied ONLY to this
 * route. It captures the raw request bytes into req.body (a Buffer) BEFORE
 * express.json() touches it. This is mandatory for HMAC signature verification.
 *
 * This route is declared FIRST so the raw-body middleware is registered before
 * any JSON-parsing middleware that Express might apply later.
 *
 * Do NOT move this route below a router.use(express.json()) call.
 */
router.post(
  "/webhook",
  raw({ type: "application/json" }), // ← raw Buffer body for HMAC verification
  handleRazorpayWebhook
);

/**
 * GET /api/payments/stats
 */
router.get("/stats", getPaymentStats);

/**
 * POST /api/payments/create-order
 * Initiates a Razorpay payment order.
 */
router.post("/create-order", createRazorpayOrder);

/**
 * POST /api/payments/verify
 * Verifies the Razorpay payment signature and logs the transaction.
 */
router.post("/verify", verifyRazorpayPayment);

export default router;

