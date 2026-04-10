import { Request, Response } from "express";
import { db } from "../../db";
import { gameTypes, levelPools, levelEntries, wallets, withdrawals, users } from "../../db/schema";
import { eq, and, sql, desc } from "drizzle-orm";

/**
 * Helper to get the current user ID for testing/seamless integration.
 * In a real app, this would come from auth middleware (req.user.id).
 * If missing, falls back to the first user in the database (e.g., Ravi Kumar from seed).
 */
const getUserId = async (providedUserId?: any) => {
  if (providedUserId && providedUserId !== 'undefined' && typeof providedUserId === 'string') return providedUserId;
  const [firstUser] = await db.select().from(users).limit(1);
  return firstUser?.id;
};

/* ================= USER ENDPOINTS ================= */

// GET /api/level-games
export const getLevelGames = async (req: Request, res: Response) => {
  try {
    const games = await db.select()
      .from(gameTypes)
      .where(and(eq(gameTypes.type, 'level'), eq(gameTypes.isActive, true)));
    res.json(games);
  } catch (error) {
    console.error("Error fetching level games:", error);
    res.status(500).json({ error: "Failed to fetch level games" });
  }
};

// GET /api/levels?levelGameId={id}
export const getActiveLevels = async (req: Request, res: Response) => {
  try {
    const { levelGameId } = req.query;
    if (!levelGameId) return res.status(400).json({ error: "levelGameId is required" });

    const pools = await db.select({
      id: levelPools.id,
      level: levelPools.level,
      currentUsers: levelPools.currentCount,
      requiredUsers: levelPools.requiredCount,
      status: levelPools.status,
      gameName: gameTypes.name,
      entryFee: gameTypes.entryFee,
      commissionRate: gameTypes.commissionRate
    })
      .from(levelPools)
      .innerJoin(gameTypes, eq(levelPools.gameTypeId, gameTypes.id))
      .where(and(
        eq(levelPools.gameTypeId, Number(levelGameId)),
        eq(levelPools.status, 'filling')
      ));

    const formattedPools = pools.map(p => {
      // NEW LOGIC: Registration fee for every level is now the same as the base entry fee.
      // We no longer multiply the fee by the level number.
      const entryFee = Number(p.entryFee);

      return {
        ...p,
        // The display fee remains fixed for all levels
        entryFee: entryFee.toString(),
        // NEW LOGIC: The reward (prize) is always exactly DOUBLE the registration fee.
        // For example, if entry is 10, the reward is 20.
        reward: entryFee * 2
      };
    });

    res.json(formattedPools);
  } catch (error) {
    console.error("Error fetching active levels:", error);
    res.status(500).json({ error: "Failed to fetch active levels" });
  }
};

// POST /api/levels/join
export const joinLevel = async (req: Request, res: Response) => {
  try {
    const { poolId } = req.body;
    
    // Authenticated user extraction via `protect` middleware
    const user = (req as any).user;
    let userId = user?.id;

    // Fallback solely to support tests directly hitting controller
    if (!userId) {
       userId = await getUserId(req.body.userId);
    }

    if (!poolId || !userId) return res.status(400).json({ error: "Could not identify user or pool" });

    // NEW CHECK: Prevent joining if the ID is a frontend placeholder (e.g., "placeholder-1")
    if (typeof poolId === 'string' && poolId.startsWith('placeholder-')) {
      return res.status(400).json({ error: "This level pool hasn't been initialized by the admin yet." });
    }

    // Basic UUID format check to avoid DB query failure
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (typeof poolId === 'string' && !uuidRegex.test(poolId)) {
      return res.status(400).json({ error: "Invalid Pool ID format." });
    }

    await db.transaction(async (tx) => {
      const [pool] = await tx.select({
        pool: levelPools,
        game: gameTypes
      })
        .from(levelPools)
        .innerJoin(gameTypes, eq(levelPools.gameTypeId, gameTypes.id))
        .where(eq(levelPools.id, poolId));

      if (!pool || pool.pool.status !== 'filling') {
        throw new Error("Pool is not available for joining");
      }

      // NEW LOGIC: Every level requires the same fixed registration fee.
      // We use the base entry fee from the game configuration without multiplying by the level.
      const entryFee = Number(pool.game.entryFee);

      const [wallet] = await tx.select().from(wallets).where(eq(wallets.userId, userId));
      if (!wallet || Number(wallet.balance) < entryFee) {
        throw new Error("Insufficient wallet balance");
      }

      const newBalance = (Number(wallet.balance) - entryFee).toString();
      await tx.update(wallets).set({ balance: newBalance }).where(eq(wallets.id, wallet.id));

      await tx.insert(levelEntries).values({
        userId,
        gameTypeId: pool.game.id,
        poolId: pool.pool.id,
        level: pool.pool.level,
        amountPaid: entryFee.toString(),
        status: 'active'
      });

      const newCount = pool.pool.currentCount + 1;
      await tx.update(levelPools).set({ currentCount: newCount }).where(eq(levelPools.id, pool.pool.id));

      if (newCount >= pool.pool.requiredCount) {
        await tx.update(levelPools).set({ status: 'completed' }).where(eq(levelPools.id, pool.pool.id));
      }
    });

    res.json({ success: true, message: "Joined pool successfully" });
  } catch (error: any) {
    console.error("Join level error:", error.message);
    res.status(400).json({ error: error.message });
  }
};

// GET /api/levels/my-entries
export const getMyEntries = async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req.query.userId);
    if (!userId) return res.status(400).json({ error: "Could not identify user" });

    const entries = await db.select({
      id: levelEntries.id,
      level: levelEntries.level,
      amount: levelEntries.amountPaid,
      createdAt: levelEntries.createdAt,
      status: levelEntries.status,
      gameName: gameTypes.name
    })
      .from(levelEntries)
      .innerJoin(gameTypes, eq(levelEntries.gameTypeId, gameTypes.id))
      .where(eq(levelEntries.userId, userId))
      .orderBy(desc(levelEntries.createdAt));

    res.json(entries);
  } catch (error) {
    console.error("Error fetching my entries:", error);
    res.status(500).json({ error: "Failed to fetch entries" });
  }
};

// GET /api/wallet
export const getWallet = async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req.query.userId);
    if (!userId) return res.status(400).json({ error: "Could not identify user" });

    const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, userId));
    if (!wallet) return res.status(404).json({ error: "Wallet not found" });

    res.json({
      available: Number(wallet.balance),
      locked: Number(wallet.lockedAmount)
    });
  } catch (error) {
    console.error("Error fetching wallet:", error);
    res.status(500).json({ error: "Failed to fetch wallet" });
  }
};

// POST /api/withdraw
export const withdraw = async (req: Request, res: Response) => {
  try {
    const { amount } = req.body;
    const userId = await getUserId(req.body.userId);
    if (!userId || !amount) return res.status(400).json({ error: "User identification or amount missing" });

    await db.transaction(async (tx) => {
      const [wallet] = await tx.select().from(wallets).where(eq(wallets.userId, userId));
      if (!wallet || Number(wallet.balance) < Number(amount)) {
        throw new Error("Insufficient balance for withdrawal");
      }

      const newBalance = (Number(wallet.balance) - Number(amount)).toString();
      await tx.update(wallets).set({ balance: newBalance }).where(eq(wallets.id, wallet.id));

      await tx.insert(withdrawals).values({
        userId,
        amount: amount.toString(),
        status: 'pending'
      });
    });

    res.json({ success: true, message: "Withdrawal request submitted" });
  } catch (error: any) {
    console.error("Withdraw error:", error.message);
    res.status(400).json({ error: error.message });
  }
};

/* ================= ADMIN ENDPOINTS ================= */

// GET /api/admin/level-games
export const getAdminLevelGames = async (req: Request, res: Response) => {
  try {
    const games = await db.select().from(gameTypes).where(eq(gameTypes.type, 'level'));
    res.json(games);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch admin level games" });
  }
};

// POST /api/admin/level-games
export const createLevelGame = async (req: Request, res: Response) => {
  try {
    const { name, entryFee, description, icon } = req.body;

    const [newGame] = await db.insert(gameTypes).values({
      name,
      entryFee: entryFee.toString(),
      description: description || "Level-based game",
      icon: icon || "🎮",
      type: 'level',
      isActive: true
    }).returning();

    await db.insert(levelPools).values({
      gameTypeId: newGame.id,
      level: 1,
      requiredCount: 4,
      status: 'filling'
    });

    res.json({ success: true, game: newGame });
  } catch (error: any) {
    console.error("Error creating game:", error);
    res.status(400).json({ error: error.message });
  }
};

// GET /api/admin/level-games/stats
export const getAdminStats = async (req: Request, res: Response) => {
  try {
    const totalGamesCount = await db.select({ count: sql`count(*)` }).from(gameTypes).where(eq(gameTypes.type, 'level'));
    const activePoolsCount = await db.select({ count: sql`count(*)` }).from(levelPools).where(eq(levelPools.status, 'filling'));
    const totalEntriesCount = await db.select({ count: sql`count(*)` }).from(levelEntries);
    const totalPayoutsResult = await db.select({ total: sql`sum(amount)` }).from(withdrawals).where(eq(withdrawals.status, 'success'));

    res.json({
      totalGames: Number(totalGamesCount[0].count),
      activePools: Number(activePoolsCount[0].count),
      totalUsers: Number(totalEntriesCount[0].count),
      totalPayouts: Number(totalPayoutsResult[0].total || 0)
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
};

// GET /api/admin/levels
export const getAdminLevels = async (req: Request, res: Response) => {
  try {
    const { levelGameId } = req.query;

    let query = db.select({
      id: levelPools.id,
      level: levelPools.level,
      gameName: gameTypes.name,
      currentUsers: levelPools.currentCount,
      requiredUsers: levelPools.requiredCount,
      status: levelPools.status,
      entryFee: gameTypes.entryFee,
      commissionRate: gameTypes.commissionRate
    })
      .from(levelPools)
      .innerJoin(gameTypes, eq(levelPools.gameTypeId, gameTypes.id));

    if (levelGameId && levelGameId !== 'All') {
      query = query.where(eq(levelPools.gameTypeId, Number(levelGameId))) as any;
    }

    const pools = await query;

    const formatted = pools.map(p => ({
      ...p,
      // NEW LOGIC: Administrative view also reflects the fixed reward (double the registration fee).
      reward: Number(p.entryFee) * 2
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch admin levels" });
  }
};

// POST /api/admin/levels
// Manually initialize a new level pool for a game
export const createAdminLevel = async (req: Request, res: Response) => {
  try {
    const { gameTypeId, level, requiredCount } = req.body;

    // Insert into DB
    const [result] = await db.insert(levelPools).values({
      gameTypeId: Number(gameTypeId),
      level: Number(level),
      requiredCount: Number(requiredCount),
      currentCount: 0,
      status: 'filling'
    }).returning();

    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Create Level Error:", error);
    res.status(500).json({ error: "Could not create level" });
  }
};

// POST /api/admin/levels/force-complete
export const forceCompletePool = async (req: Request, res: Response) => {
  try {
    const { poolId } = req.body;
    await db.update(levelPools).set({ status: 'completed' }).where(eq(levelPools.id, poolId));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to force complete pool" });
  }
};
