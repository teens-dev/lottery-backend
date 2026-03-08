import {
  pgTable, uuid, integer, varchar,
  timestamp, boolean, primaryKey, index,
  text
} from 'drizzle-orm/pg-core';
import { draws } from './core';
import { levels } from './independent';
import { users, admins, notificationCampaigns } from './core';

// ── 16. draw_eligible_levels ──
export const drawEligibleLevels = pgTable('draw_eligible_levels', {
  drawId:    uuid('draw_id').references(() => draws.id, { onDelete: 'cascade' }).notNull(),
  levelId:   integer('level_id').references(() => levels.id).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.drawId, t.levelId] }),
}));

// ── 17. user_notification_reads ──
export const userNotificationReads = pgTable('user_notification_reads', {
  userId:     uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  campaignId: uuid('campaign_id').references(() => notificationCampaigns.id, { onDelete: 'cascade' }).notNull(),
  readAt:     timestamp('read_at').defaultNow(),
  clickedAt:  timestamp('clicked_at'),
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.campaignId] }),
}));

// ── 18. campaign_channels ──
export const campaignChannels = pgTable('campaign_channels', {
  campaignId:      uuid('campaign_id').references(() => notificationCampaigns.id, { onDelete: 'cascade' }).notNull(),
  channel:         varchar('channel', { length: 20 }).notNull(),
  deliveredCount:  integer('delivered_count').notNull().default(0),
  failedCount:     integer('failed_count').notNull().default(0),
}, (t) => ({
  pk: primaryKey({ columns: [t.campaignId, t.channel] }),
}));

// ── 19. draw_winners ──
export const drawWinners = pgTable('draw_winners', {
  id:           uuid('id').primaryKey().defaultRandom(),
  drawId:       uuid('draw_id').references(() => draws.id).notNull(),
  userId:       uuid('user_id').references(() => users.id).notNull(),
  prizeAmount:  varchar('prize_amount', { length: 20 }),
  paidAt:       timestamp('paid_at'),
  paymentTxnId: uuid('payment_txn_id'),
  createdAt:    timestamp('created_at').defaultNow(),
}, (t) => ({
  drawUserIdx: index('draw_winners_draw_user_idx').on(t.drawId, t.userId),
}));

// ── 20. user_badges ──
export const userBadges = pgTable('user_badges', {
  userId:    uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  badgeId:   integer('badge_id').notNull(),
  earnedAt:  timestamp('earned_at').defaultNow(),
  reason:    text('reason'),
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.badgeId] }),
}));

// ── 21. admin_ip_whitelist ──
export const adminIpWhitelist = pgTable('admin_ip_whitelist', {
  adminId:   uuid('admin_id').references(() => admins.id, { onDelete: 'cascade' }).notNull(),
  ipAddress: varchar('ip_address', { length: 45 }).notNull(),
  addedAt:   timestamp('added_at').defaultNow(),
  label:     varchar('label', { length: 100 }),
}, (t) => ({
  pk: primaryKey({ columns: [t.adminId, t.ipAddress] }),
}));