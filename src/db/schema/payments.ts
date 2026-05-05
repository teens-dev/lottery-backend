import {
  pgTable, uuid, integer, varchar,
  boolean, timestamp, pgEnum, index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './core';

// ── Enum: payment_order_status ──
// Represents the lifecycle state of a Razorpay payment order.
export const paymentOrderStatusEnum = pgEnum('payment_order_status', [
  'pending',  // Order created at Razorpay but payment not yet received
  'success',  // Payment captured successfully
  'failed',   // Payment attempt failed or was declined
]);

// ── 35. payment_orders ──
// Tracks every Razorpay order initiated by a user for wallet top-ups
// or game entry fee payments. One row per Razorpay order.
export const paymentOrders = pgTable('payment_orders', {
  /** Unique internal identifier for this payment order */
  id: uuid('id').primaryKey().defaultRandom(),

  /** The user who initiated this payment order */
  userId: uuid('user_id')
    .references(() => users.id)
    .notNull(),

  /**
   * Amount in the smallest currency unit (paise for INR).
   * e.g. ₹499 is stored as 49900.
   * Stored as integer to avoid floating-point issues.
   */
  amount: integer('amount').notNull(),

  /**
   * Razorpay's unique order identifier (e.g. order_XYZabc123).
   * Used to match webhook callbacks and verify payments.
   * Must be unique across all rows.
   */
  razorpayOrderId: varchar('razorpay_order_id', { length: 100 })
    .notNull()
    .unique(),

  /** Current status of the payment order */
  status: paymentOrderStatusEnum('status').notNull().default('pending'),

  /** Timestamp when the order row was created in our system */
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => ({
  /** Speed up lookups by user (e.g. payment history page) */
  userIdx:    index('payment_orders_user_idx').on(t.userId),
  /** Speed up webhook lookups by Razorpay order ID */
  rzpOrderIdx: index('payment_orders_rzp_order_idx').on(t.razorpayOrderId),
  /** Speed up filtering orders by status (e.g. pending reconciliation) */
  statusIdx:  index('payment_orders_status_idx').on(t.status),
}));

// ── 36. user_bank_accounts ──
// Stores bank account and UPI details submitted by users for withdrawals.
// A single user may have multiple bank accounts, but only one should
// be marked as verified at any time (enforced at application layer).
export const userBankAccounts = pgTable('user_bank_accounts', {
  /** Unique internal identifier for this bank account record */
  id: uuid('id').primaryKey().defaultRandom(),

  /** The user who owns this bank account */
  userId: uuid('user_id')
    .references(() => users.id)
    .notNull(),

  /**
   * Bank account number provided by the user.
   * Stored as a string to preserve leading zeros and handle
   * all Indian bank account number formats.
   */
  accountNumber: varchar('account_number', { length: 25 }).notNull(),

  /**
   * IFSC (Indian Financial System Code) of the user's bank branch.
   * Standard format: 4 alpha chars + 0 + 6 alphanumeric chars (e.g. SBIN0001234).
   */
  ifsc: varchar('ifsc', { length: 15 }).notNull(),

  /**
   * UPI Virtual Payment Address (VPA) linked to the user's account.
   * Optional — a user may provide only bank details or only UPI.
   * Example: userhandle@upi
   */
  upiId: varchar('upi_id', { length: 100 }),

  /**
   * Whether this bank account has been verified by the platform
   * (e.g. via penny drop or manual admin review).
   * Only verified accounts are eligible for withdrawals.
   */
  isVerified: boolean('is_verified').notNull().default(false),

  /** Timestamp when the bank account record was first created */
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => ({
  /** Speed up fetching all bank accounts for a given user */
  userIdx: index('user_bank_accounts_user_idx').on(t.userId),
  /** Speed up lookups for verified accounts only */
  verifiedIdx: index('user_bank_accounts_verified_idx').on(t.userId, t.isVerified),
}));

// ── Relations ──

/** A user can have many payment orders */
export const paymentOrdersRelations = relations(paymentOrders, ({ one }) => ({
  user: one(users, {
    fields: [paymentOrders.userId],
    references: [users.id],
  }),
}));

/** A user can have many bank accounts */
export const userBankAccountsRelations = relations(userBankAccounts, ({ one }) => ({
  user: one(users, {
    fields: [userBankAccounts.userId],
    references: [users.id],
  }),
}));
