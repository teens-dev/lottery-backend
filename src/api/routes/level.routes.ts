import { Router } from "express";
import { 
  getLevelGames, 
  getActiveLevels, 
  joinLevel, 
  getMyEntries, 
  getWallet, 
  withdraw,
  getAdminLevelGames,
  createLevelGame,
  getAdminStats,
  getAdminLevels,
  createAdminLevel,
  forceCompletePool
} from "../controllers/level.controller";

const router = Router();

/* ================= USER ROUTES ================= */

/**
 * @swagger
 * /api/level-games:
 *   get:
 *     summary: Return all level games
 *     tags: [Level Game]
 */
router.get("/level-games", getLevelGames);

/**
 * @swagger
 * /api/levels:
 *   get:
 *     summary: Return active level pools for a game
 *     tags: [Level Game]
 */
router.get("/levels", getActiveLevels);

/**
 * @swagger
 * /api/levels/join:
 *   post:
 *     summary: Join a level pool
 *     tags: [Level Game]
 */
router.post("/levels/join", joinLevel);

/**
 * @swagger
 * /api/levels/my-entries:
 *   get:
 *     summary: Return user entries
 *     tags: [Level Game]
 */
router.get("/levels/my-entries", getMyEntries);

/**
 * @swagger
 * /api/wallet:
 *   get:
 *     summary: Return user wallet balance
 *     tags: [Wallet]
 */
router.get("/wallet", getWallet);

/**
 * @swagger
 * /api/withdraw:
 *   post:
 *     summary: Withdraw funds from wallet
 *     tags: [Wallet]
 */
router.post("/withdraw", withdraw);

/* ================= ADMIN ROUTES ================= */

/**
 * @swagger
 * /api/admin/level-games:
 *   get:
 *     summary: List all level games for admin
 *     tags: [Admin Level Game]
 */
router.get("/admin/level-games", getAdminLevelGames);

/**
 * @swagger
 * /api/admin/level-games:
 *   post:
 *     summary: Create a new level game
 *     tags: [Admin Level Game]
 */
router.post("/admin/level-games", createLevelGame);

/**
 * @swagger
 * /api/admin/level-games/stats:
 *   get:
 *     summary: Get level game statistics
 *     tags: [Admin Level Game]
 */
router.get("/admin/level-games/stats", getAdminStats);

/**
 * @swagger
 * /api/admin/levels:
 *   get:
 *     summary: List all pools for admin
 *     tags: [Admin Level Game]
 */
router.get("/admin/levels", getAdminLevels);

/**
 * @swagger
 * /api/admin/levels:
 *   post:
 *     summary: Initialize a new level pool
 *     tags: [Admin Level Game]
 */
router.post("/admin/levels", createAdminLevel);

/**
 * @swagger
 * /api/admin/levels/force-complete:
 *   post:
 *     summary: Manually complete a pool
 *     tags: [Admin Level Game]
 */
router.post("/admin/levels/force-complete", forceCompletePool);

export default router;
