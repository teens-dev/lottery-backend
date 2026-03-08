import {
  pgTable, uuid, integer, varchar, text,
  boolean, numeric, timestamp, pgEnum, index
} from 'drizzle-orm/pg-core';
import { users, admins, draws, wallets,
  kycSubmissions, notificationCampaigns } from './core';
import { paymentMethods, gameTypes, rejectionReasons } from './independent';
import { drawWinners } from './junction';

// ── Enums ──
export const txnTypeEnum = pgEnum('txn_type', [
  'deposit', 'withdrawal', 'ticket_purchase', 'prize_payout',
  'bonus_credit', 'referral_reward', 'manual_adjustment',
]);

export const txnStatusEnum = pgEnum('txn_status', [
  'pending', 'success', 'failed', 'refunded',
]);

export const adjustTypeEnum = pgEnum('adjust_type', ['add', 'deduct']);

export const notifStatusEnum = pgEnum('notif_status', [
  'sent', 'delivered', 'failed', 'opened',
]);

export const ticketStatusEnum = pgEnum('ticket_status', [
  'active', 'used', 'expired', 'refunded',
]);

// ── 22. tickets ──
export const tickets = pgTable('tickets', {
  id:             uuid('id').primaryKey().defaultRandom(),
  userId:         uuid('user_id').references(() => users.id).notNull(),
  drawId:         uuid('draw_id').references(() => draws.id).notNull(),
  ticketNumber:   varchar('ticket_number', { length: 50 }).notNull().unique(),
  pricePaid:      numeric('price_paid', { precision: 10, scale: 2 }).notNull(),
  pickedNumbers:  varchar('picked_numbers', { length: 200 }),
  isAutoPick:     boolean('is_auto_pick').notNull().default(false),
  status:         ticketStatusEnum('status').notNull().default('active'),
  isWinner:       boolean('is_winner').notNull().default(false),
  purchasedAt:    timestamp('purchased_at').defaultNow(),
}, (t) => ({
  userDrawIdx:    index('tickets_user_draw_idx').on(t.userId, t.drawId),
  drawIdx:        index('tickets_draw_idx').on(t.drawId),
  ticketNumIdx:   index('tickets_number_idx').on(t.ticketNumber),
}));

// ── 23. transactions ──
export const transactions = pgTable('transactions', {
  id:             uuid('id').primaryKey().defaultRandom(),
  userId:         uuid('user_id').references(() => users.id).notNull(),
  walletId:       uuid('wallet_id').references(() => wallets.id).notNull(),
  methodId:       integer('method_id').references(() => paymentMethods.id),
  txnRef:         varchar('txn_ref', { length: 100 }).notNull().unique(),
  amount:         numeric('amount', { precision: 15, scale: 2 }).notNull(),
  type:           txnTypeEnum('type').notNull(),
  status:         txnStatusEnum('status').notNull().default('pending'),
  gatewayTxnId:   varchar('gateway_txn_id', { length: 200 }),
  note:           text('note'),
  createdAt:      timestamp('created_at').defaultNow(),
}, (t) => ({
  userCreatedIdx: index('txns_user_created_idx').on(t.userId, t.createdAt),
  statusIdx:      index('txns_status_idx').on(t.status),
  createdAtIdx:   index('txns_created_at_idx').on(t.createdAt),
}));

// ── 24. wallet_adjustments ──
export const walletAdjustments = pgTable('wallet_adjustments', {
  id:        uuid('id').primaryKey().defaultRandom(),
  walletId:  uuid('wallet_id').references(() => wallets.id).notNull(),
  adminId:   uuid('admin_id').references(() => admins.id).notNull(),
  txnId:     uuid('txn_id').references(() => transactions.id),
  type:      adjustTypeEnum('type').notNull(),
  amount:    numeric('amount', { precision: 12, scale: 2 }).notNull(),
  reason:    varchar('reason', { length: 200 }).notNull(),
  note:      text('note'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ── 25. referrals ──
export const referrals = pgTable('referrals', {
  id:               uuid('id').primaryKey().defaultRandom(),
  referrerUserId:   uuid('referrer_user_id').references(() => users.id).notNull(),
  referredUserId:   uuid('referred_user_id').references(() => users.id).notNull().unique(),
  rewardGiven:      boolean('reward_given').notNull().default(false),
  completedAt:      timestamp('completed_at'),
  createdAt:        timestamp('created_at').defaultNow(),
}, (t) => ({
  referrerIdx: index('referrals_referrer_idx').on(t.referrerUserId),
}));

// ── 26. referral_rewards ──
export const referralRewards = pgTable('referral_rewards', {
  id:            uuid('id').primaryKey().defaultRandom(),
  referralId:    uuid('referral_id').references(() => referrals.id).notNull(),
  transactionId: uuid('transaction_id').references(() => transactions.id),
  amount:        numeric('amount', { precision: 10, scale: 2 }).notNull(),
  type:          varchar('type', { length: 20 }).notNull(),
  paidAt:        timestamp('paid_at').defaultNow(),
});

// ── 27. points_rules ──
export const pointsRules = pgTable('points_rules', {
  id:           integer('id').primaryKey().generatedByDefaultAsIdentity(),
  gameTypeId:   integer('game_type_id').references(() => gameTypes.id),
  action:       varchar('action', { length: 100 }).notNull().unique(),
  pointsValue:  integer('points_value').notNull(),
  description:  text('description'),
  limitPerDay:  integer('limit_per_day'),
  isActive:     boolean('is_active').notNull().default(true),
});

// ── 28. points_history ──
export const pointsHistory = pgTable('points_history', {
  id:          uuid('id').primaryKey().defaultRandom(),
  userId:      uuid('user_id').references(() => users.id).notNull(),
  ruleId:      integer('rule_id').references(() => pointsRules.id),
  points:      integer('points').notNull(),
  action:      varchar('action', { length: 100 }).notNull(),
  referenceId: uuid('reference_id'),
  createdAt:   timestamp('created_at').defaultNow(),
}, (t) => ({
  userCreatedIdx: index('pts_hist_user_created_idx').on(t.userId, t.createdAt),
}));

// ── 29. draw_results ──
export const drawResults = pgTable('draw_results', {
  id:                 uuid('id').primaryKey().defaultRandom(),
  drawId:             uuid('draw_id').references(() => draws.id).notNull().unique(),
  winningNumbers:     varchar('winning_numbers', { length: 200 }).notNull(),
  totalTicketsSold:   integer('total_tickets_sold').notNull(),
  totalPrizePaid:     numeric('total_prize_paid', { precision: 15, scale: 2 }).notNull(),
  winnersCount:       integer('winners_count').notNull().default(0),
  rngSeed:            varchar('rng_seed', { length: 200 }),
  resultDeclaredAt:   timestamp('result_declared_at').defaultNow(),
});

// ── 30. kyc_review_log ──
export const kycReviewLog = pgTable('kyc_review_log', {
  id:             uuid('id').primaryKey().defaultRandom(),
  submissionId:   uuid('submission_id').references(() => kycSubmissions.id).notNull(),
  adminId:        uuid('admin_id').references(() => admins.id).notNull(),
  reasonId:       integer('reason_id').references(() => rejectionReasons.id),
  action:         varchar('action', { length: 20 }).notNull(),
  notes:          text('notes'),
  reviewedAt:     timestamp('reviewed_at').defaultNow(),
});

// ── 31. notifications_sent ──
export const notificationsSent = pgTable('notifications_sent', {
  id:         uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id').references(() => notificationCampaigns.id).notNull(),
  userId:     uuid('user_id').references(() => users.id).notNull(),
  channel:    varchar('channel', { length: 20 }).notNull(),
  status:     notifStatusEnum('status').notNull().default('sent'),
  sentAt:     timestamp('sent_at').defaultNow(),
  openedAt:   timestamp('opened_at'),
}, (t) => ({
  campaignUserIdx: index('notif_sent_campaign_user_idx').on(t.campaignId, t.userId),
}));

// ── 32. audit_logs ──
export const auditLogs = pgTable('audit_logs', {
  id:          uuid('id').primaryKey().defaultRandom(),
  adminId:     uuid('admin_id').references(() => admins.id).notNull(),
  action:      varchar('action', { length: 200 }).notNull(),
  targetType:  varchar('target_type', { length: 100 }),
  targetId:    varchar('target_id', { length: 100 }),
  oldValue:    text('old_value'),
  newValue:    text('new_value'),
  ipAddress:   varchar('ip_address', { length: 45 }),
  createdAt:   timestamp('created_at').defaultNow(),
}, (t) => ({
  adminCreatedIdx: index('audit_admin_created_idx').on(t.adminId, t.createdAt),
}));

// ── 33. user_sessions ──
export const userSessions = pgTable('user_sessions', {
  id:          uuid('id').primaryKey().defaultRandom(),
  userId:      uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  token:       varchar('token', { length: 500 }).notNull().unique(),
  deviceType:  varchar('device_type', { length: 50 }),
  ipAddress:   varchar('ip_address', { length: 45 }),
  expiresAt:   timestamp('expires_at').notNull(),
  createdAt:   timestamp('created_at').defaultNow(),
}, (t) => ({
  tokenIdx:  index('sessions_token_idx').on(t.token),
  userIdx:   index('sessions_user_idx').on(t.userId),
}));

// ── 34. prize_payouts ──
export const prizePayouts = pgTable('prize_payouts', {
  id:            uuid('id').primaryKey().defaultRandom(),
  winnerId:      uuid('winner_id').references(() => drawWinners.id).notNull(),
  walletId:      uuid('wallet_id').references(() => wallets.id).notNull(),
  transactionId: uuid('transaction_id').references(() => transactions.id),
  amount:        numeric('amount', { precision: 15, scale: 2 }).notNull(),
  taxDeducted:   numeric('tax_deducted', { precision: 10, scale: 2 }).notNull().default('0'),
  netAmount:     numeric('net_amount', { precision: 15, scale: 2 }).notNull(),
  status:        txnStatusEnum('status').notNull().default('pending'),
  paidAt:        timestamp('paid_at'),
  createdAt:     timestamp('created_at').defaultNow(),
});