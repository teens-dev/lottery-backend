// import { db } from './index';
// import {
//   levels, gameTypes, paymentMethods,
//   kycDocumentTypes, countries, adminRoles, rejectionReasons
// } from './schema/index';

// async function seed() {
//   console.log('Seeding master data...');

//   await db.insert(levels).values([
//     { levelNum: 1,  name: 'Basic Member', color: '#4a5568', pointsMin: 0,     pointsMax: 99,    discountPct: 0,  picksCount: 1  },
//     { levelNum: 2,  name: 'Bronze',       color: '#cd7c2f', pointsMin: 100,   pointsMax: 299,   discountPct: 5,  picksCount: 2  },
//     { levelNum: 3,  name: 'Silver',       color: '#94a3b8', pointsMin: 300,   pointsMax: 599,   discountPct: 10, picksCount: 3  },
//     { levelNum: 4,  name: 'Gold',         color: '#f5c518', pointsMin: 600,   pointsMax: 999,   discountPct: 15, picksCount: 4  },
//     { levelNum: 5,  name: 'Platinum',     color: '#00d68f', pointsMin: 1000,  pointsMax: 1999,  discountPct: 20, picksCount: 5  },
//     { levelNum: 6,  name: 'Diamond',      color: '#06b6d4', pointsMin: 2000,  pointsMax: 4999,  discountPct: 25, picksCount: 6  },
//     { levelNum: 7,  name: 'Elite',        color: '#a855f7', pointsMin: 5000,  pointsMax: 9999,  discountPct: 30, picksCount: 7  },
//     { levelNum: 8,  name: 'Superstar',    color: '#f59e0b', pointsMin: 10000, pointsMax: 19999, discountPct: 35, picksCount: 8  },
//     { levelNum: 9,  name: 'Titan',        color: '#3d9eff', pointsMin: 20000, pointsMax: 49999, discountPct: 40, picksCount: 9  },
//     { levelNum: 10, name: 'VIP',          color: '#f5c518', pointsMin: 50000, pointsMax: null,  discountPct: 50, picksCount: 99 },
//   ]).onConflictDoNothing();

//   await db.insert(gameTypes).values([
//     { name: 'Mega Millions',  icon: '🎰', description: 'Large jackpot draws' },
//     { name: 'Super Jackpot',  icon: '💰', description: 'Weekly jackpots'     },
//     { name: 'Power Ball',     icon: '⚡', description: 'Daily power draws'   },
//     { name: 'Daily Draw',     icon: '🎯', description: 'Daily small draws'   },
//     { name: 'Weekly Special', icon: '🌟', description: 'Weekly specials'     },
//   ]).onConflictDoNothing();

//   await db.insert(paymentMethods).values([
//     { name: 'UPI',         icon: '📱' },
//     { name: 'Card',        icon: '💳' },
//     { name: 'Net Banking', icon: '🏦' },
//     { name: 'Wallet',      icon: '👛' },
//     { name: 'PayPal',      icon: '🔵' },
//   ]).onConflictDoNothing();

//   await db.insert(kycDocumentTypes).values([
//     { name: 'Aadhaar Card', countriesAccepted: ['IN'] },
//     { name: 'PAN Card',     countriesAccepted: ['IN'] },
//     { name: 'Passport',     countriesAccepted: ['IN', 'US', 'UK', 'AE'] },
//     { name: 'Voter ID',     countriesAccepted: ['IN'] },
//     { name: 'Driving License', countriesAccepted: ['IN', 'US', 'UK'] },
//   ]).onConflictDoNothing();

//   await db.insert(adminRoles).values([
//     { name: 'Super Admin',      permissions: ['*'] },
//     { name: 'Operations Manager', permissions: ['users', 'draws', 'kyc', 'reports'] },
//     { name: 'Finance Manager',  permissions: ['payments', 'wallets', 'reports'] },
//     { name: 'Support Agent',    permissions: ['users:read', 'notifications'] },
//     { name: 'Compliance Officer', permissions: ['kyc', 'audit_logs', 'reports'] },
//   ]).onConflictDoNothing();

//   await db.insert(rejectionReasons).values([
//     { reason: 'Blurry/Unclear Image',      description: 'Document image is not clearly readable' },
//     { reason: 'Name Mismatch',             description: 'Name on document differs from account' },
//     { reason: 'Expired Document',          description: 'Document has passed its expiry date'   },
//     { reason: 'Suspected Fake Document',   description: 'Document appears to be tampered with'  },
//     { reason: 'Incomplete Submission',     description: 'Required pages or selfie are missing'  },
//   ]).onConflictDoNothing();

//   console.log('Seed complete! All master data inserted.');
//   process.exit(0);
// }

// seed().catch((err) => {
//   console.error('Seed failed:', err);
//   process.exit(1);
// });



import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import * as schema from './schema/index';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false ,
});

const db = drizzle(pool, { schema });

async function seed() {
  console.log('🌱 Starting seed...\n');

  // ════════════════════════════════════════════
  // TIER 1 — INDEPENDENT TABLES (no foreign keys)
  // ════════════════════════════════════════════

  // 1. levels
  console.log('→ Seeding levels...');
  const [level1] = await db.insert(schema.levels).values({
    levelNum:    1,
    name:        'Basic Member',
    color:       '#4a5568',
    pointsMin:   0,
    pointsMax:   99,
    discountPct: 0,
    picksCount:  1,
    perks:       ['1 number pick', 'Standard tickets', 'Basic wallet access'],
    isActive:    true,
  }).returning();

  // 2. game_types
  console.log('→ Seeding game_types...');
  const [gameType1] = await db.insert(schema.gameTypes).values({
    name:        'Mega Millions',
    description: 'Large jackpot draws with massive prize pools',
    icon:        '🎰',
    isActive:    true,
  }).returning();

  // 3. payment_methods
  console.log('→ Seeding payment_methods...');
  const [paymentMethod1] = await db.insert(schema.paymentMethods).values({
    name:     'UPI',
    icon:     '📱',
    isActive: true,
  }).returning();

  // 4. kyc_document_types
  console.log('→ Seeding kyc_document_types...');
  const [kycDocType1] = await db.insert(schema.kycDocumentTypes).values({
    name:               'Aadhaar Card',
    description:        'Government issued 12-digit unique identity card',
    countriesAccepted:  ['IN'],
    isActive:           true,
  }).returning();

  // 5. notification_templates
  console.log('→ Seeding notification_templates...');
  const [notifTemplate1] = await db.insert(schema.notificationTemplates).values({
    title:    'Draw Started!',
    message:  'A new draw has started. Buy your tickets now before time runs out!',
    icon:     '🎯',
    type:     'draw_started',
    isActive: true,
  }).returning();

  // 6. rejection_reasons
  console.log('→ Seeding rejection_reasons...');
  const [rejectionReason1] = await db.insert(schema.rejectionReasons).values({
    reason:      'Blurry/Unclear Image',
    description: 'The document image is not clearly readable. Please re-upload a clear photo.',
  }).returning();

  // 7. countries
  console.log('→ Seeding countries...');
  const [country1] = await db.insert(schema.countries).values({
    name:     'India',
    code:     'IN',
    currency: 'INR',
    isActive: true,
  }).returning();

  // 8. admin_roles
  console.log('→ Seeding admin_roles...');
  const [adminRole1] = await db.insert(schema.adminRoles).values({
    name:        'Super Admin',
    permissions: ['*'],
  }).returning();

  // ════════════════════════════════════════════
  // TIER 2 — CORE PRIMARY TABLES
  // ════════════════════════════════════════════

  // 9. users
  console.log('→ Seeding users...');
  const [user1] = await db.insert(schema.users).values({
    levelId:       level1.id,
    countryId:     country1.id,
    name:          'Ravi Kumar',
    email:         'ravi.kumar@example.com',
    phone:         '+919876543210',
    passwordHash:  '$2b$10$examplehashedpassword123456789012345678',
    avatarUrl:     null,
    points:        250,
    totalPoints:   450,
    status:        'active',
    kycStatus:     'verified',
    mfaEnabled:    false,
    mfaSecret:     null,
    emailVerified: true,
    phoneVerified: true,
    lastLoginAt:   new Date(),
  }).returning();

  // 10. admins
  console.log('→ Seeding admins...');
  const [admin1] = await db.insert(schema.admins).values({
    roleId:       adminRole1.id,
    name:         'Admin User',
    email:        'admin@lotterynetwork.com',
    passwordHash: '$2b$10$exampleadminhashedpassword1234567890123',
    isActive:     true,
    lastLoginAt:  new Date(),
  }).returning();

  // 11. draws
  console.log('→ Seeding draws...');
  const [draw1] = await db.insert(schema.draws).values({
    gameTypeId:     gameType1.id,
    createdBy:      admin1.id,
    name:           'Mega Millions #4821',
    prizePool:      '10000000.00',
    ticketPrice:    '100.00',
    maxEntries:     10000,
    currentEntries: 3241,
    status:         'live',
    drawDate:       new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
    description:    'Weekly mega draw with ₹1 Crore prize pool',
    rngSeedHash:    'a1b2c3d4e5f67890123456789012345',
    isGuaranteed:   true,
    minEntries:     100,
  }).returning();

  // 12. wallets
  console.log('→ Seeding wallets...');
  const [wallet1] = await db.insert(schema.wallets).values({
    userId:       user1.id,
    balance:      '4200.00',
    bonusBalance: '500.00',
    lockedAmount: '0.00',
    currency:     'INR',
  }).returning();

  // 13. referral_codes
  console.log('→ Seeding referral_codes...');
  const [referralCode1] = await db.insert(schema.referralCodes).values({
    userId:         user1.id,
    code:           'RAVI2024',
    totalReferrals: 3,
    totalEarned:    '1500.00',
  }).returning();

  // 14. kyc_submissions
  console.log('→ Seeding kyc_submissions...');
  const [kycSubmission1] = await db.insert(schema.kycSubmissions).values({
    userId:      user1.id,
    docTypeId:   kycDocType1.id,
    docNumber:   'XXXX-XXXX-1234',
    frontUrl:    'https://storage.example.com/kyc/ravi_aadhaar_front.jpg',
    backUrl:     'https://storage.example.com/kyc/ravi_aadhaar_back.jpg',
    selfieUrl:   'https://storage.example.com/kyc/ravi_selfie.jpg',
    status:      'verified',
    submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    reviewedAt:  new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
  }).returning();

  // 15. notification_campaigns
  console.log('→ Seeding notification_campaigns...');
  const [campaign1] = await db.insert(schema.notificationCampaigns).values({
    adminId:        admin1.id,
    templateId:     notifTemplate1.id,
    title:          'Mega Millions Draw is LIVE!',
    message:        'Hurry! The Mega Millions #4821 draw is now live. Buy your tickets before 10 PM tonight!',
    targetAudience: 'all_users',
    targetLevelMin: 1,
    scheduledAt:    null,
    sentAt:         new Date(),
    totalSent:      24891,
    totalOpened:    7024,
    totalClicked:   2981,
    status:         'sent',
  }).returning();

  // ════════════════════════════════════════════
  // TIER 3 — JUNCTION / RELATIONSHIP TABLES
  // ════════════════════════════════════════════

  // 16. draw_eligible_levels
  console.log('→ Seeding draw_eligible_levels...');
  await db.insert(schema.drawEligibleLevels).values({
    drawId:  draw1.id,
    levelId: level1.id,
  });

  // 17. user_notification_reads
  console.log('→ Seeding user_notification_reads...');
  await db.insert(schema.userNotificationReads).values({
    userId:     user1.id,
    campaignId: campaign1.id,
    readAt:     new Date(),
    clickedAt:  new Date(Date.now() + 5 * 60 * 1000), // 5 mins after read
  });

  // 18. campaign_channels
  console.log('→ Seeding campaign_channels...');
  await db.insert(schema.campaignChannels).values({
    campaignId:     campaign1.id,
    channel:        'push',
    deliveredCount: 23400,
    failedCount:    1491,
  });

  // 19. draw_winners (use a completed draw concept — reuse draw1 for demo)
  console.log('→ Seeding draw_winners...');
  const [drawWinner1] = await db.insert(schema.drawWinners).values({
    drawId:       draw1.id,
    userId:       user1.id,
    prizeAmount:  '10000000.00',
    paidAt:       new Date(),
    paymentTxnId: null, // will link after transaction created
  }).returning();

  // 20. user_badges
  console.log('→ Seeding user_badges...');
  await db.insert(schema.userBadges).values({
    userId:   user1.id,
    badgeId:  1, // "First Ticket" badge
    earnedAt: new Date(),
    reason:   'Purchased first lottery ticket',
  });

  // 21. admin_ip_whitelist
  console.log('→ Seeding admin_ip_whitelist...');
  await db.insert(schema.adminIpWhitelist).values({
    adminId:   admin1.id,
    ipAddress: '192.168.1.100',
    label:     'Office Primary IP',
  });

  // ════════════════════════════════════════════
  // TIER 4 — DEPENDENT / CHILD TABLES
  // ════════════════════════════════════════════

  // 22. tickets
  console.log('→ Seeding tickets...');
  const [ticket1] = await db.insert(schema.tickets).values({
    userId:        user1.id,
    drawId:        draw1.id,
    ticketNumber:  'TKT-2024-000001',
    pricePaid:     '100.00',
    pickedNumbers: '4,12,23,34,41,6',
    isAutoPick:    false,
    status:        'active',
    isWinner:      true,
  }).returning();

  // 23. transactions
  console.log('→ Seeding transactions...');
  const [transaction1] = await db.insert(schema.transactions).values({
    userId:       user1.id,
    walletId:     wallet1.id,
    methodId:     paymentMethod1.id,
    txnRef:       'TXN-2024-00000001',
    amount:       '2000.00',
    type:         'deposit',
    status:       'success',
    gatewayTxnId: 'rzp_live_abcdef123456',
    note:         'Wallet top-up via UPI',
  }).returning();

  // 24. wallet_adjustments
  console.log('→ Seeding wallet_adjustments...');
  await db.insert(schema.walletAdjustments).values({
    walletId: wallet1.id,
    adminId:  admin1.id,
    txnId:    transaction1.id,
    type:     'add',
    amount:   '500.00',
    reason:   'Bonus Award',
    note:     'Welcome bonus for completing KYC verification',
  });

  // 25. referrals
  console.log('→ Seeding referrals...');

  // Need a second user to be the referred user
  const [user2] = await db.insert(schema.users).values({
    levelId:       level1.id,
    countryId:     country1.id,
    name:          'Priya Sharma',
    email:         'priya.sharma@example.com',
    phone:         '+919876543211',
    passwordHash:  '$2b$10$examplehashedpassword987654321098765432',
    points:        50,
    totalPoints:   50,
    status:        'active',
    kycStatus:     'pending',
    mfaEnabled:    false,
    emailVerified: true,
    phoneVerified: true,
    lastLoginAt:   new Date(),
  }).returning();

  // Wallet for user2 (required for referral rewards later)
  const [wallet2] = await db.insert(schema.wallets).values({
    userId:       user2.id,
    balance:      '200.00',
    bonusBalance: '200.00',
    lockedAmount: '0.00',
    currency:     'INR',
  }).returning();

  const [referral1] = await db.insert(schema.referrals).values({
    referrerUserId: user1.id,   // Ravi referred Priya
    referredUserId: user2.id,
    rewardGiven:    true,
    completedAt:    new Date(),
  }).returning();

  // 26. referral_rewards
  console.log('→ Seeding referral_rewards...');
  const [refTxn] = await db.insert(schema.transactions).values({
    userId:    user1.id,
    walletId:  wallet1.id,
    methodId:  null,
    txnRef:    'TXN-2024-REF-00001',
    amount:    '500.00',
    type:      'referral_reward',
    status:    'success',
    note:      'Referral reward for inviting Priya Sharma',
  }).returning();

  await db.insert(schema.referralRewards).values({
    referralId:    referral1.id,
    transactionId: refTxn.id,
    amount:        '500.00',
    type:          'referrer',
    paidAt:        new Date(),
  });

  // 27. points_rules
  console.log('→ Seeding points_rules...');
  const [pointsRule1] = await db.insert(schema.pointsRules).values({
    gameTypeId:   null,
    action:       'ticket_purchase',
    pointsValue:  10,
    description:  '10 points per ₹100 spent on tickets',
    limitPerDay:  null,
    isActive:     true,
  }).returning();

  // 28. points_history
  console.log('→ Seeding points_history...');
  await db.insert(schema.pointsHistory).values({
    userId:      user1.id,
    ruleId:      pointsRule1.id,
    points:      10,
    action:      'ticket_purchase',
    referenceId: ticket1.id,
  });

  // 29. draw_results
  console.log('→ Seeding draw_results...');
  await db.insert(schema.drawResults).values({
    drawId:           draw1.id,
    winningNumbers:   '4,12,23,34,41,6',
    totalTicketsSold: 3241,
    totalPrizePaid:   '10000000.00',
    winnersCount:     1,
    rngSeed:          'seed_a1b2c3d4_verified_by_audit_firm_2024',
    resultDeclaredAt: new Date(),
  });

  // 30. kyc_review_log
  console.log('→ Seeding kyc_review_log...');
  await db.insert(schema.kycReviewLog).values({
    submissionId: kycSubmission1.id,
    adminId:      admin1.id,
    reasonId:     null, // null because approved, not rejected
    action:       'approved',
    notes:        'All documents verified. Aadhaar name matches account name.',
    reviewedAt:   new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  });

  // 31. notifications_sent
  console.log('→ Seeding notifications_sent...');
  await db.insert(schema.notificationsSent).values({
    campaignId: campaign1.id,
    userId:     user1.id,
    channel:    'push',
    status:     'delivered',
    sentAt:     new Date(),
    openedAt:   new Date(Date.now() + 3 * 60 * 1000), // opened 3 mins after
  });

  // 32. audit_logs
  console.log('→ Seeding audit_logs...');
  await db.insert(schema.auditLogs).values({
    adminId:    admin1.id,
    action:     'Approved KYC for Ravi Kumar',
    targetType: 'kyc_submission',
    targetId:   kycSubmission1.id,
    oldValue:   JSON.stringify({ status: 'pending' }),
    newValue:   JSON.stringify({ status: 'verified' }),
    ipAddress:  '192.168.1.100',
  });

  // 33. user_sessions
  console.log('→ Seeding user_sessions...');
  await db.insert(schema.userSessions).values({
    userId:     user1.id,
    token:      'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.sample_token_for_seeding_only',
    deviceType: 'android',
    ipAddress:  '103.21.58.100',
    expiresAt:  new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  });

  // 34. prize_payouts
  console.log('→ Seeding prize_payouts...');
  const [payoutTxn] = await db.insert(schema.transactions).values({
    userId:       user1.id,
    walletId:     wallet1.id,
    methodId:     null,
    txnRef:       'TXN-2024-PAYOUT-00001',
    amount:       '10000000.00',
    type:         'prize_payout',
    status:       'success',
    note:         'Prize payout for winning Mega Millions #4821',
  }).returning();

  await db.insert(schema.prizePayouts).values({
    winnerId:      drawWinner1.id,
    walletId:      wallet1.id,
    transactionId: payoutTxn.id,
    amount:        '10000000.00',
    taxDeducted:   '3000000.00',  // 30% TDS
    netAmount:     '7000000.00',
    status:        'success',
    paidAt:        new Date(),
  });

  // ════════════════════════════════════════════
  // DONE
  // ════════════════════════════════════════════
  console.log('\n✅ Seed complete! All 34 tables have at least 1 row.\n');
  console.log('Summary:');
  console.log('  Independent tables : 8  rows inserted');
  console.log('  Core tables        : 7  rows inserted (+ 1 extra user for referral)');
  console.log('  Junction tables    : 6  rows inserted');
  console.log('  Dependent tables   : 13 rows inserted');
  console.log('  Total              : 34+ rows across 34 tables');

  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});