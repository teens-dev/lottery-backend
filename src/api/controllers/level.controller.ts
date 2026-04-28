// import { Request, Response } from "express";
// import { db } from "../../db";
// import { gameTypes, levelPools, levelEntries, wallets, withdrawals, users } from "../../db/schema";
// import { eq, and, sql, desc, or } from "drizzle-orm";

// const getUserId = async (providedUserId?: any) => {
//   if (providedUserId && providedUserId !== 'undefined' && typeof providedUserId === 'string') return providedUserId;
//   const [firstUser] = await db.select().from(users).limit(1);
//   return firstUser?.id;
// };

// /* ================= USER ENDPOINTS ================= */

// // GET /api/level-games
// export const getLevelGames = async (req: Request, res: Response) => {
//   try {
//     const games = await db.select()
//       .from(gameTypes)
//       .where(and(eq(gameTypes.type, 'level'), eq(gameTypes.isActive, true)));
//     res.json(games);
//   } catch (error) {
//     console.error("Error fetching level games:", error);
//     res.status(500).json({ error: "Failed to fetch level games" });
//   }
// };

// // GET /api/levels?levelGameId={id}
// export const getActiveLevels = async (req: Request, res: Response) => {
//   try {
//     const { levelGameId } = req.query;
//     if (!levelGameId) return res.status(400).json({ error: "levelGameId is required" });

//     const pools = await db.select({
//       id:             levelPools.id,
//       level:          levelPools.level,
//       currentUsers:   levelPools.currentCount,
//       requiredUsers:  levelPools.requiredCount,
//       status:         levelPools.status,
//       gameName:       gameTypes.name,
//       entryFee:       gameTypes.entryFee,
//       commissionRate: gameTypes.commissionRate,
//       createdAt:      levelPools.createdAt,
//     })
//       .from(levelPools)
//       .innerJoin(gameTypes, eq(levelPools.gameTypeId, gameTypes.id))
//       .where(
//         and(
//           eq(levelPools.gameTypeId, Number(levelGameId)),
//           or(eq(levelPools.status, 'filling'), eq(levelPools.status, 'completed'))
//         )
//       )
//       .orderBy(
//         levelPools.level,
//         sql`CASE WHEN ${levelPools.status} = 'completed' THEN 0 ELSE 1 END`,
//         desc(levelPools.currentCount)
//       );

//     // ✅ DEDUP: per level keep completed > filling, ignore extra duplicates
//     const seen = new Map<number, typeof pools[0]>();
//     for (const pool of pools) {
//       const lvl = Number(pool.level);
//       const existing = seen.get(lvl);
//       if (!existing) {
//         seen.set(lvl, pool);
//       } else if (pool.status === 'completed' && existing.status !== 'completed') {
//         seen.set(lvl, pool);
//       }
//     }

//     const dedupedPools = Array.from(seen.values());

//     const formattedPools = dedupedPools.map(p => {
//       const entryFee = Number(p.entryFee);
//       const lvlNum   = Number(p.level);
//       const required = lvlNum * 4;
//       return {
//         ...p,
//         entryFee:     entryFee.toString(),
//         reward:       entryFee * 2,
//         // ✅ FIX: completed pools always show full count, never 0
//         currentUsers:  p.status === 'completed' ? required : Number(p.currentUsers),
//         requiredUsers: required,
//       };
//     });

//     res.json(formattedPools);
//   } catch (error) {
//     console.error("Error fetching active levels:", error);
//     res.status(500).json({ error: "Failed to fetch active levels" });
//   }
// };

// // POST /api/levels/join
// export const joinLevel = async (req: Request, res: Response) => {
//   try {
//     const { poolId } = req.body;

//     const user = (req as any).user;
//     let userId = user?.id;
//     if (!userId) userId = await getUserId(req.body.userId);
//     if (!poolId || !userId) return res.status(400).json({ error: "Could not identify user or pool" });

//     await db.transaction(async (tx) => {
//       let actualPoolId = poolId;

//       if (typeof poolId === 'string' && poolId.startsWith('placeholder-')) {
//         const parts    = poolId.split('-');
//         if (parts.length < 3) throw new Error("Invalid placeholder format.");
//         const gameId   = parseInt(parts[1], 10);
//         const levelNum = parseInt(parts[2], 10);
//         if (isNaN(gameId) || isNaN(levelNum)) throw new Error("Invalid gameId or levelNum in placeholder.");

//         // ✅ If this level already has a completed pool → block join
//         const [alreadyCompleted] = await tx.select()
//           .from(levelPools)
//           .where(and(
//             eq(levelPools.gameTypeId, gameId),
//             eq(levelPools.level, levelNum),
//             eq(levelPools.status, 'completed')
//           ))
//           .limit(1);

//         if (alreadyCompleted) {
//           throw new Error("This level is already completed. Please join the next level.");
//         }

//         const requiredForThisLevel = levelNum * 4;

//         const [existingPool] = await tx.select()
//           .from(levelPools)
//           .where(and(
//             eq(levelPools.gameTypeId, gameId),
//             eq(levelPools.level, levelNum),
//             eq(levelPools.status, 'filling')
//           ))
//           .limit(1);

//         if (existingPool) {
//           actualPoolId = existingPool.id;
//         } else {
//           const [game] = await tx.select().from(gameTypes).where(eq(gameTypes.id, gameId));
//           if (!game) throw new Error("Game not found.");

//           const [newPool] = await tx.insert(levelPools).values({
//             gameTypeId:    gameId,
//             level:         levelNum,
//             requiredCount: requiredForThisLevel,
//             currentCount:  0,
//             status:        'filling'
//           }).returning({ id: levelPools.id });

//           actualPoolId = newPool.id;
//         }
//       } else {
//         const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
//         if (typeof poolId === 'string' && !uuidRegex.test(poolId)) {
//           throw new Error("Invalid Pool ID format.");
//         }
//       }

//       const [pool] = await tx.select({ pool: levelPools, game: gameTypes })
//         .from(levelPools)
//         .innerJoin(gameTypes, eq(levelPools.gameTypeId, gameTypes.id))
//         .where(eq(levelPools.id, actualPoolId));

//       if (!pool || pool.pool.status !== 'filling') {
//         throw new Error("Pool is not available for joining");
//       }

//       const entryFee = Number(pool.game.entryFee);

//       const [wallet] = await tx.select().from(wallets).where(eq(wallets.userId, userId));
//       if (!wallet || Number(wallet.balance) < entryFee) {
//         throw new Error("Insufficient wallet balance");
//       }

//       await tx.update(wallets)
//         .set({ balance: (Number(wallet.balance) - entryFee).toString() })
//         .where(eq(wallets.id, wallet.id));

//       await tx.insert(levelEntries).values({
//         userId,
//         gameTypeId: pool.game.id,
//         poolId:     pool.pool.id,
//         level:      pool.pool.level,
//         amountPaid: entryFee.toString(),
//         status:     'active'
//       });

//       const newCount = pool.pool.currentCount + 1;

//       if (newCount >= pool.pool.requiredCount) {
//         // ✅ Mark pool COMPLETED — no new pool for same level, ever
//         await tx.update(levelPools)
//           .set({ currentCount: newCount, status: 'completed' })
//           .where(eq(levelPools.id, pool.pool.id));

//         // ✅ Open NEXT level only (not the same level again)
//         const nextLevel = pool.pool.level + 1;
//         if (nextLevel <= 10) {
//           const [existingNext] = await tx.select()
//             .from(levelPools)
//             .where(and(
//               eq(levelPools.gameTypeId, pool.game.id),
//               eq(levelPools.level, nextLevel),
//               eq(levelPools.status, 'filling')
//             ))
//             .limit(1);

//           if (!existingNext) {
//             await tx.insert(levelPools).values({
//               gameTypeId:    pool.game.id,
//               level:         nextLevel,
//               requiredCount: nextLevel * 4,
//               currentCount:  0,
//               status:        'filling'
//             });
//           }
//         }
//       } else {
//         // Still filling — increment count only
//         await tx.update(levelPools)
//           .set({ currentCount: newCount })
//           .where(eq(levelPools.id, pool.pool.id));
//       }
//     });

//     res.json({ success: true, message: "Joined pool successfully" });
//   } catch (error: any) {
//     console.error("Join level error:", error.message);
//     res.status(400).json({ error: error.message });
//   }
// };

// // GET /api/levels/my-entries
// export const getMyEntries = async (req: Request, res: Response) => {
//   try {
//     const user = (req as any).user;
//     let userId = user?.id;
//     if (!userId) userId = await getUserId(req.query.userId as string);
//     if (!userId) return res.status(400).json({ error: "Could not identify user" });

//     const entries = await db.select({
//       id:            levelEntries.id,
//       level:         levelEntries.level,
//       amount:        levelEntries.amountPaid,
//       createdAt:     levelEntries.createdAt,
//       status:        levelEntries.status,
//       gameName:      gameTypes.name,
//       gameTypeId:    levelEntries.gameTypeId,
//       poolStatus:    levelPools.status,
//       currentCount:  levelPools.currentCount,
//       requiredCount: levelPools.requiredCount,
//     })
//       .from(levelEntries)
//       .innerJoin(gameTypes, eq(levelEntries.gameTypeId, gameTypes.id))
//       .leftJoin(levelPools, eq(levelEntries.poolId, levelPools.id))
//       .where(eq(levelEntries.userId, userId))
//       .orderBy(desc(levelEntries.createdAt));

//     // ✅ FIX: for completed pools, always show full required count
//     const fixedEntries = entries.map(e => {
//       const required = Number(e.level) * 4;
//       return {
//         ...e,
//         currentCount:  e.poolStatus === 'completed' ? required : (e.currentCount ?? 0),
//         requiredCount: required,
//       };
//     });

//     res.json(fixedEntries);
//   } catch (error) {
//     console.error("Error fetching my entries:", error);
//     res.status(500).json({ error: "Failed to fetch entries" });
//   }
// };

// // GET /api/wallet
// export const getWallet = async (req: Request, res: Response) => {
//   try {
//     const userId = await getUserId(req.query.userId);
//     if (!userId) return res.status(400).json({ error: "Could not identify user" });

//     const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, userId));
//     if (!wallet) return res.status(404).json({ error: "Wallet not found" });

//     res.json({ available: Number(wallet.balance), locked: Number(wallet.lockedAmount) });
//   } catch (error) {
//     console.error("Error fetching wallet:", error);
//     res.status(500).json({ error: "Failed to fetch wallet" });
//   }
// };

// // POST /api/withdraw
// export const withdraw = async (req: Request, res: Response) => {
//   try {
//     const { amount } = req.body;
//     const userId = await getUserId(req.body.userId);
//     if (!userId || !amount) return res.status(400).json({ error: "User identification or amount missing" });

//     await db.transaction(async (tx) => {
//       const [wallet] = await tx.select().from(wallets).where(eq(wallets.userId, userId));
//       if (!wallet || Number(wallet.balance) < Number(amount)) {
//         throw new Error("Insufficient balance for withdrawal");
//       }
//       await tx.update(wallets)
//         .set({ balance: (Number(wallet.balance) - Number(amount)).toString() })
//         .where(eq(wallets.id, wallet.id));
//       await tx.insert(withdrawals).values({ userId, amount: amount.toString(), status: 'pending' });
//     });

//     res.json({ success: true, message: "Withdrawal request submitted" });
//   } catch (error: any) {
//     console.error("Withdraw error:", error.message);
//     res.status(400).json({ error: error.message });
//   }
// };

// /* ================= ADMIN ENDPOINTS ================= */

// export const getAdminLevelGames = async (req: Request, res: Response) => {
//   try {
//     const games = await db.select().from(gameTypes).where(eq(gameTypes.type, 'level'));
//     res.json(games);
//   } catch (error) {
//     res.status(500).json({ error: "Failed to fetch admin level games" });
//   }
// };

// export const createLevelGame = async (req: Request, res: Response) => {
//   try {
//     const { name, entryFee, description, icon } = req.body;

//     const [newGame] = await db.insert(gameTypes).values({
//       name,
//       entryFee:    entryFee.toString(),
//       description: description || "Level-based game",
//       icon:        icon || "🎮",
//       type:        'level',
//       isActive:    true
//     }).returning();

//     // Only Level 1 starts open
//     await db.insert(levelPools).values({
//       gameTypeId:    newGame.id,
//       level:         1,
//       requiredCount: 4,
//       currentCount:  0,
//       status:        'filling'
//     });

//     res.json({ success: true, game: newGame });
//   } catch (error: any) {
//     console.error("Error creating game:", error);
//     res.status(400).json({ error: error.message });
//   }
// };

// export const getAdminStats = async (req: Request, res: Response) => {
//   try {
//     const totalGamesCount    = await db.select({ count: sql`count(*)` }).from(gameTypes).where(eq(gameTypes.type, 'level'));
//     const activePoolsCount   = await db.select({ count: sql`count(*)` }).from(levelPools).where(eq(levelPools.status, 'filling'));
//     const totalEntriesCount  = await db.select({ count: sql`count(*)` }).from(levelEntries);
//     const totalPayoutsResult = await db.select({ total: sql`sum(amount)` }).from(withdrawals).where(eq(withdrawals.status, 'success'));

//     res.json({
//       totalGames:   Number(totalGamesCount[0].count),
//       activePools:  Number(activePoolsCount[0].count),
//       totalUsers:   Number(totalEntriesCount[0].count),
//       totalPayouts: Number(totalPayoutsResult[0].total || 0)
//     });
//   } catch (error) {
//     res.status(500).json({ error: "Failed to fetch stats" });
//   }
// };

// export const getAdminLevels = async (req: Request, res: Response) => {
//   try {
//     const { levelGameId } = req.query;

//     let query = db.select({
//       id:             levelPools.id,
//       level:          levelPools.level,
//       gameName:       gameTypes.name,
//       currentUsers:   levelPools.currentCount,
//       requiredUsers:  levelPools.requiredCount,
//       status:         levelPools.status,
//       entryFee:       gameTypes.entryFee,
//       commissionRate: gameTypes.commissionRate
//     })
//       .from(levelPools)
//       .innerJoin(gameTypes, eq(levelPools.gameTypeId, gameTypes.id));

//     if (levelGameId && levelGameId !== 'All') {
//       query = query.where(eq(levelPools.gameTypeId, Number(levelGameId))) as any;
//     }

//     const pools     = await query;
//     const formatted = pools.map(p => ({ ...p, reward: Number(p.entryFee) * 2 }));
//     res.json(formatted);
//   } catch (error) {
//     res.status(500).json({ error: "Failed to fetch admin levels" });
//   }
// };

// export const createAdminLevel = async (req: Request, res: Response) => {
//   try {
//     const { gameTypeId, level, requiredCount } = req.body;
//     const finalRequiredCount = requiredCount ? Number(requiredCount) : Number(level) * 4;

//     const [result] = await db.insert(levelPools).values({
//       gameTypeId:    Number(gameTypeId),
//       level:         Number(level),
//       requiredCount: finalRequiredCount,
//       currentCount:  0,
//       status:        'filling'
//     }).returning();

//     res.json({ success: true, data: result });
//   } catch (error) {
//     console.error("Create Level Error:", error);
//     res.status(500).json({ error: "Could not create level" });
//   }
// };

// export const fixRequiredCounts = async (req: Request, res: Response) => {
//   try {
//     const allPools = await db.select({ id: levelPools.id, level: levelPools.level, requiredCount: levelPools.requiredCount }).from(levelPools);

//     let fixed = 0;
//     for (const pool of allPools) {
//       const correct = Number(pool.level) * 4;
//       if (Number(pool.requiredCount) !== correct) {
//         await db.update(levelPools).set({ requiredCount: correct }).where(eq(levelPools.id, pool.id));
//         fixed++;
//       }
//     }

//     res.json({ success: true, message: `Fixed ${fixed} pool(s) with wrong requiredCount`, total: allPools.length, fixed });
//   } catch (error) {
//     console.error("Fix required counts error:", error);
//     res.status(500).json({ error: "Failed to fix required counts" });
//   }
// };

// // POST /api/admin/levels/force-complete
// export const forceCompletePool = async (req: Request, res: Response) => {
//   try {
//     const { poolId } = req.body;

//     const [pool] = await db.select({ pool: levelPools, game: gameTypes })
//       .from(levelPools)
//       .innerJoin(gameTypes, eq(levelPools.gameTypeId, gameTypes.id))
//       .where(eq(levelPools.id, poolId));

//     // ✅ Complete the pool — set current_count to required_count so it shows correctly
//     if (pool) {
//       await db.update(levelPools)
//         .set({ status: 'completed', currentCount: pool.pool.requiredCount })
//         .where(eq(levelPools.id, poolId));

//       // Open NEXT level only
//       const nextLevel = pool.pool.level + 1;
//       if (nextLevel <= 10) {
//         const [existingNext] = await db.select()
//           .from(levelPools)
//           .where(and(
//             eq(levelPools.gameTypeId, pool.game.id),
//             eq(levelPools.level, nextLevel),
//             eq(levelPools.status, 'filling')
//           ))
//           .limit(1);

//         if (!existingNext) {
//           await db.insert(levelPools).values({
//             gameTypeId:    pool.game.id,
//             level:         nextLevel,
//             requiredCount: nextLevel * 4,
//             currentCount:  0,
//             status:        'filling'
//           });
//         }
//       }
//     }

//     res.json({ success: true });
//   } catch (error) {
//     res.status(500).json({ error: "Failed to force complete pool" });
//   }
// };
import { Request, Response } from "express";
import { db } from "../../db";
import { gameTypes, levelPools, levelEntries, wallets, withdrawals, users } from "../../db/schema";
import { eq, and, sql, desc, or } from "drizzle-orm";

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
      id:             levelPools.id,
      level:          levelPools.level,
      currentUsers:   levelPools.currentCount,
      requiredUsers:  levelPools.requiredCount,
      status:         levelPools.status,
      gameName:       gameTypes.name,
      entryFee:       gameTypes.entryFee,
      commissionRate: gameTypes.commissionRate,
      createdAt:      levelPools.createdAt,
    })
      .from(levelPools)
      .innerJoin(gameTypes, eq(levelPools.gameTypeId, gameTypes.id))
      .where(
        and(
          eq(levelPools.gameTypeId, Number(levelGameId)),
          or(eq(levelPools.status, 'filling'), eq(levelPools.status, 'completed'))
        )
      )
      .orderBy(
        levelPools.level,
        sql`CASE WHEN ${levelPools.status} = 'completed' THEN 0 ELSE 1 END`,
        desc(levelPools.currentCount)
      );

    // ✅ DEDUP: per level keep completed > filling, ignore extra duplicates
    const seen = new Map<number, typeof pools[0]>();
    for (const pool of pools) {
      const lvl = Number(pool.level);
      const existing = seen.get(lvl);
      if (!existing) {
        seen.set(lvl, pool);
      } else if (pool.status === 'completed' && existing.status !== 'completed') {
        seen.set(lvl, pool);
      }
    }

    const dedupedPools = Array.from(seen.values());

    const formattedPools = dedupedPools.map(p => {
      const entryFee = Number(p.entryFee);
      const lvlNum   = Number(p.level);
      const required = lvlNum * 4;
      return {
        ...p,
        entryFee:     entryFee.toString(),
        reward:       entryFee * 2,
        // ✅ FIX: completed pools always show full count, never 0
        currentUsers:  p.status === 'completed' ? required : Number(p.currentUsers),
        requiredUsers: required,
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

    const user = (req as any).user;
    let userId = user?.id;
    if (!userId) userId = await getUserId(req.body.userId);
    if (!poolId || !userId) return res.status(400).json({ error: "Could not identify user or pool" });

    await db.transaction(async (tx) => {
      let actualPoolId = poolId;

      if (typeof poolId === 'string' && poolId.startsWith('placeholder-')) {
        const parts    = poolId.split('-');
        if (parts.length < 3) throw new Error("Invalid placeholder format.");
        const gameId   = parseInt(parts[1], 10);
        const levelNum = parseInt(parts[2], 10);
        if (isNaN(gameId) || isNaN(levelNum)) throw new Error("Invalid gameId or levelNum in placeholder.");

        // ✅ If this level already has a completed pool → block join
        // (completed levels cannot be joined again, they are full forever)
        const [alreadyCompleted] = await tx.select()
          .from(levelPools)
          .where(and(
            eq(levelPools.gameTypeId, gameId),
            eq(levelPools.level, levelNum),
            eq(levelPools.status, 'completed')
          ))
          .limit(1);

        if (alreadyCompleted) {
          throw new Error("This level is already completed.");
        }

        const requiredForThisLevel = levelNum * 4;

        const [existingPool] = await tx.select()
          .from(levelPools)
          .where(and(
            eq(levelPools.gameTypeId, gameId),
            eq(levelPools.level, levelNum),
            eq(levelPools.status, 'filling')
          ))
          .limit(1);

        if (existingPool) {
          actualPoolId = existingPool.id;
        } else {
          const [game] = await tx.select().from(gameTypes).where(eq(gameTypes.id, gameId));
          if (!game) throw new Error("Game not found.");

          const [newPool] = await tx.insert(levelPools).values({
            gameTypeId:    gameId,
            level:         levelNum,
            requiredCount: requiredForThisLevel,
            currentCount:  0,
            status:        'filling'
          }).returning({ id: levelPools.id });

          actualPoolId = newPool.id;
        }
      } else {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (typeof poolId === 'string' && !uuidRegex.test(poolId)) {
          throw new Error("Invalid Pool ID format.");
        }
      }

      const [pool] = await tx.select({ pool: levelPools, game: gameTypes })
        .from(levelPools)
        .innerJoin(gameTypes, eq(levelPools.gameTypeId, gameTypes.id))
        .where(eq(levelPools.id, actualPoolId));

      if (!pool || pool.pool.status !== 'filling') {
        throw new Error("Pool is not available for joining");
      }

      const entryFee = Number(pool.game.entryFee);

      const [wallet] = await tx.select().from(wallets).where(eq(wallets.userId, userId));
      if (!wallet || Number(wallet.balance) < entryFee) {
        throw new Error("Insufficient wallet balance");
      }

      await tx.update(wallets)
        .set({ balance: (Number(wallet.balance) - entryFee).toString() })
        .where(eq(wallets.id, wallet.id));

      await tx.insert(levelEntries).values({
        userId,
        gameTypeId: pool.game.id,
        poolId:     pool.pool.id,
        level:      pool.pool.level,
        amountPaid: entryFee.toString(),
        status:     'active'
      });

      const newCount = pool.pool.currentCount + 1;

      if (newCount >= pool.pool.requiredCount) {
        // ✅ Mark pool COMPLETED — no new pool for same level, ever
        await tx.update(levelPools)
          .set({ currentCount: newCount, status: 'completed' })
          .where(eq(levelPools.id, pool.pool.id));

        // ✅ Open NEXT level only (not the same level again)
        const nextLevel = pool.pool.level + 1;
        if (nextLevel <= 10) {
          const [existingNext] = await tx.select()
            .from(levelPools)
            .where(and(
              eq(levelPools.gameTypeId, pool.game.id),
              eq(levelPools.level, nextLevel),
              eq(levelPools.status, 'filling')
            ))
            .limit(1);

          if (!existingNext) {
            await tx.insert(levelPools).values({
              gameTypeId:    pool.game.id,
              level:         nextLevel,
              requiredCount: nextLevel * 4,
              currentCount:  0,
              status:        'filling'
            });
          }
        }
      } else {
        // Still filling — increment count only
        await tx.update(levelPools)
          .set({ currentCount: newCount })
          .where(eq(levelPools.id, pool.pool.id));
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
    const user = (req as any).user;
    let userId = user?.id;
    if (!userId) userId = await getUserId(req.query.userId as string);
    if (!userId) return res.status(400).json({ error: "Could not identify user" });

    const entries = await db.select({
      id:            levelEntries.id,
      level:         levelEntries.level,
      amount:        levelEntries.amountPaid,
      createdAt:     levelEntries.createdAt,
      status:        levelEntries.status,
      gameName:      gameTypes.name,
      gameTypeId:    levelEntries.gameTypeId,
      poolStatus:    levelPools.status,
      currentCount:  levelPools.currentCount,
      requiredCount: levelPools.requiredCount,
    })
      .from(levelEntries)
      .innerJoin(gameTypes, eq(levelEntries.gameTypeId, gameTypes.id))
      .leftJoin(levelPools, eq(levelEntries.poolId, levelPools.id))
      .where(eq(levelEntries.userId, userId))
      .orderBy(desc(levelEntries.createdAt));

    // ✅ FIX: for completed pools, always show full required count
    const fixedEntries = entries.map(e => {
      const required = Number(e.level) * 4;
      return {
        ...e,
        currentCount:  e.poolStatus === 'completed' ? required : (e.currentCount ?? 0),
        requiredCount: required,
      };
    });

    res.json(fixedEntries);
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

    res.json({ available: Number(wallet.balance), locked: Number(wallet.lockedAmount) });
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
      await tx.update(wallets)
        .set({ balance: (Number(wallet.balance) - Number(amount)).toString() })
        .where(eq(wallets.id, wallet.id));
      await tx.insert(withdrawals).values({ userId, amount: amount.toString(), status: 'pending' });
    });

    res.json({ success: true, message: "Withdrawal request submitted" });
  } catch (error: any) {
    console.error("Withdraw error:", error.message);
    res.status(400).json({ error: error.message });
  }
};

/* ================= ADMIN ENDPOINTS ================= */

export const getAdminLevelGames = async (req: Request, res: Response) => {
  try {
    const games = await db.select().from(gameTypes).where(eq(gameTypes.type, 'level'));
    res.json(games);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch admin level games" });
  }
};

export const createLevelGame = async (req: Request, res: Response) => {
  try {
    const { name, entryFee, description, icon } = req.body;

    const [newGame] = await db.insert(gameTypes).values({
      name,
      entryFee:    entryFee.toString(),
      description: description || "Level-based game",
      icon:        icon || "🎮",
      type:        'level',
      isActive:    true
    }).returning();

    // Only Level 1 starts open
    await db.insert(levelPools).values({
      gameTypeId:    newGame.id,
      level:         1,
      requiredCount: 4,
      currentCount:  0,
      status:        'filling'
    });

    res.json({ success: true, game: newGame });
  } catch (error: any) {
    console.error("Error creating game:", error);
    res.status(400).json({ error: error.message });
  }
};

export const getAdminStats = async (req: Request, res: Response) => {
  try {
    const totalGamesCount    = await db.select({ count: sql`count(*)` }).from(gameTypes).where(eq(gameTypes.type, 'level'));
    const activePoolsCount   = await db.select({ count: sql`count(*)` }).from(levelPools).where(eq(levelPools.status, 'filling'));
    const totalEntriesCount  = await db.select({ count: sql`count(*)` }).from(levelEntries);
    const totalPayoutsResult = await db.select({ total: sql`sum(amount)` }).from(withdrawals).where(eq(withdrawals.status, 'success'));

    res.json({
      totalGames:   Number(totalGamesCount[0].count),
      activePools:  Number(activePoolsCount[0].count),
      totalUsers:   Number(totalEntriesCount[0].count),
      totalPayouts: Number(totalPayoutsResult[0].total || 0)
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
};

export const getAdminLevels = async (req: Request, res: Response) => {
  try {
    const { levelGameId } = req.query;

    let query = db.select({
      id:             levelPools.id,
      level:          levelPools.level,
      gameName:       gameTypes.name,
      currentUsers:   levelPools.currentCount,
      requiredUsers:  levelPools.requiredCount,
      status:         levelPools.status,
      entryFee:       gameTypes.entryFee,
      commissionRate: gameTypes.commissionRate
    })
      .from(levelPools)
      .innerJoin(gameTypes, eq(levelPools.gameTypeId, gameTypes.id));

    if (levelGameId && levelGameId !== 'All') {
      query = query.where(eq(levelPools.gameTypeId, Number(levelGameId))) as any;
    }

    const pools     = await query;
    const formatted = pools.map(p => ({ ...p, reward: Number(p.entryFee) * 2 }));
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch admin levels" });
  }
};

export const createAdminLevel = async (req: Request, res: Response) => {
  try {
    const { gameTypeId, level, requiredCount } = req.body;
    const finalRequiredCount = requiredCount ? Number(requiredCount) : Number(level) * 4;

    const [result] = await db.insert(levelPools).values({
      gameTypeId:    Number(gameTypeId),
      level:         Number(level),
      requiredCount: finalRequiredCount,
      currentCount:  0,
      status:        'filling'
    }).returning();

    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Create Level Error:", error);
    res.status(500).json({ error: "Could not create level" });
  }
};

export const fixRequiredCounts = async (req: Request, res: Response) => {
  try {
    const allPools = await db.select({ id: levelPools.id, level: levelPools.level, requiredCount: levelPools.requiredCount }).from(levelPools);

    let fixed = 0;
    for (const pool of allPools) {
      const correct = Number(pool.level) * 4;
      if (Number(pool.requiredCount) !== correct) {
        await db.update(levelPools).set({ requiredCount: correct }).where(eq(levelPools.id, pool.id));
        fixed++;
      }
    }

    res.json({ success: true, message: `Fixed ${fixed} pool(s) with wrong requiredCount`, total: allPools.length, fixed });
  } catch (error) {
    console.error("Fix required counts error:", error);
    res.status(500).json({ error: "Failed to fix required counts" });
  }
};

// POST /api/admin/levels/force-complete
export const forceCompletePool = async (req: Request, res: Response) => {
  try {
    const { poolId } = req.body;

    const [pool] = await db.select({ pool: levelPools, game: gameTypes })
      .from(levelPools)
      .innerJoin(gameTypes, eq(levelPools.gameTypeId, gameTypes.id))
      .where(eq(levelPools.id, poolId));

    // ✅ Complete the pool — set current_count to required_count so it shows correctly
    if (pool) {
      await db.update(levelPools)
        .set({ status: 'completed', currentCount: pool.pool.requiredCount })
        .where(eq(levelPools.id, poolId));

      // Open NEXT level only
      const nextLevel = pool.pool.level + 1;
      if (nextLevel <= 10) {
        const [existingNext] = await db.select()
          .from(levelPools)
          .where(and(
            eq(levelPools.gameTypeId, pool.game.id),
            eq(levelPools.level, nextLevel),
            eq(levelPools.status, 'filling')
          ))
          .limit(1);

        if (!existingNext) {
          await db.insert(levelPools).values({
            gameTypeId:    pool.game.id,
            level:         nextLevel,
            requiredCount: nextLevel * 4,
            currentCount:  0,
            status:        'filling'
          });
        }
      }
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to force complete pool" });
  }
};