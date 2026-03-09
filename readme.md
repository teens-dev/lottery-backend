# 1. Install
npm install drizzle-orm pg dotenv
npm install -D drizzle-kit @types/pg tsx

# 2. Generate migration SQL files from schema
npm run db:generate

# 3. Apply migrations to Supabase
npm run db:migrate

# 4. Seed master data
npx tsx src/db/seed.ts

# 5. Open Drizzle Studio (visual DB browser)
npm run db:studio

# 6. If schema changes later — regenerate + migrate
npm run db:generate
npm run db:migrate

-----------------------------------------KT-----------------------------------------

# 🎰 Lottery Network Platform — Backend Database

> **Enterprise-grade lottery platform** with 10-level progressive rewards system.  
> Built with **Node.js + Drizzle ORM + PostgreSQL (Supabase)**.

---

## 📁 Project Structure

```
backend/
├── src/
│   └── db/
│       ├── index.ts                  ← Database connection (Drizzle + pg Pool)
│       ├── seed.ts                   ← Seed file to populate all 34 tables
│       └── schema/
│           ├── index.ts              ← Re-exports all schemas (single entry point)
│           ├── independent.ts        ← 8 master/lookup tables (no foreign keys)
│           ├── core.ts               ← 7 primary domain tables
│           ├── junction.ts           ← 6 relationship/junction tables
│           └── dependent.ts          ← 13 child/transaction tables
├── drizzle.config.ts                 ← Drizzle Kit configuration
├── package.json
└── .env                              ← DATABASE_URL from Supabase
```

---

## ⚙️ Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Runtime | Node.js 20 LTS | Server runtime |
| Language | TypeScript | Type safety across all files |
| ORM | Drizzle ORM | Type-safe database queries |
| Database | PostgreSQL 16 (Supabase) | Primary data store |
| Migration Tool | Drizzle Kit | Schema migrations |
| Connection | node-postgres (pg) | PostgreSQL driver |
| Config | dotenv | Environment variables |

---

## 🚀 Setup — Step by Step

### 1. Install dependencies

```bash
cd backend
npm install drizzle-orm pg dotenv
npm install -D drizzle-kit @types/pg tsx
```

### 2. Configure environment

Create `.env` in `backend/`:

```env
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-ap-south-1.pooler.supabase.com:5432/postgres"
```

Get this from: **Supabase → Project → Settings → Database → Connection String → URI**

### 3. Generate migration files

```bash
npm run db:generate
```

This reads all schema files and generates SQL migration files inside `src/db/migrations/`.

### 4. Apply migrations to Supabase

```bash
npm run db:migrate
```

This executes the generated SQL against your Supabase database and creates all 34 tables.

### 5. Seed the database

```bash
npx tsx src/db/seed.ts
```

Inserts one fully-linked row into every table in the correct dependency order.

### 6. (Optional) Open Drizzle Studio

```bash
npm run db:studio
```

Opens a visual browser at `https://local.drizzle.studio` to inspect your tables.

---

## 📦 Package.json Scripts

```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate":  "drizzle-kit migrate",
    "db:push":     "drizzle-kit push",
    "db:studio":   "drizzle-kit studio",
    "db:drop":     "drizzle-kit drop"
  }
}
```

> **`db:push`** — skips migration files, pushes schema directly. Use in development only.

---

## 🗄️ Database Schema — All 34 Tables

The schema is split into 4 tiers based on dependency order. Tables in each tier depend only on tables from previous tiers.

```
Tier 1 (Independent)  →  Tier 2 (Core)  →  Tier 3 (Junction)  →  Tier 4 (Dependent)
```

---

## 🟦 TIER 1 — Independent Tables

> These are **master/lookup tables** with no foreign keys. They must be seeded first.

---

### 1. `levels`

Defines all 10 progression levels users can achieve on the platform.

| Column | Type | Description |
|---|---|---|
| `id` | serial PK | Auto-increment primary key |
| `level_num` | integer UNIQUE | The level number (1–10) |
| `name` | varchar(50) | Display name e.g. "Gold", "Platinum" |
| `color` | varchar(20) | Hex color code for UI badge |
| `points_min` | integer | Minimum points required to reach this level |
| `points_max` | integer | Maximum points before advancing (null for L10) |
| `discount_pct` | integer | Ticket discount percentage (0–50%) |
| `picks_count` | integer | Number of lottery numbers user can pick |
| `perks` | jsonb | Array of perk descriptions for this level |
| `is_active` | boolean | Whether this level is currently active |
| `created_at` | timestamp | Record creation timestamp |

**Relations:** Referenced by `users.level_id` and `draw_eligible_levels.level_id`

---

### 2. `game_types`

Defines categories of lottery draws available on the platform.

| Column | Type | Description |
|---|---|---|
| `id` | serial PK | Auto-increment primary key |
| `name` | varchar(100) UNIQUE | Game type name e.g. "Mega Millions" |
| `description` | text | Detailed description of the game type |
| `icon` | varchar(10) | Emoji icon for UI display |
| `is_active` | boolean | Whether this game type is currently offered |
| `created_at` | timestamp | Record creation timestamp |

**Relations:** Referenced by `draws.game_type_id` and `points_rules.game_type_id`

---

### 3. `payment_methods`

Master list of supported payment methods on the platform.

| Column | Type | Description |
|---|---|---|
| `id` | serial PK | Auto-increment primary key |
| `name` | varchar(50) UNIQUE | Method name e.g. "UPI", "Card", "Net Banking" |
| `icon` | varchar(10) | Emoji icon for UI |
| `is_active` | boolean | Whether this method is currently available |
| `created_at` | timestamp | Record creation timestamp |

**Relations:** Referenced by `transactions.method_id`

---

### 4. `kyc_document_types`

Defines the types of identity documents accepted for KYC verification.

| Column | Type | Description |
|---|---|---|
| `id` | serial PK | Auto-increment primary key |
| `name` | varchar(100) UNIQUE | Document name e.g. "Aadhaar Card", "PAN Card" |
| `description` | text | Explanation of the document |
| `countries_accepted` | jsonb | Array of country codes where this doc is valid |
| `is_active` | boolean | Whether this document type is currently accepted |

**Relations:** Referenced by `kyc_submissions.doc_type_id`

---

### 5. `notification_templates`

Pre-built message templates used when creating notification campaigns.

| Column | Type | Description |
|---|---|---|
| `id` | serial PK | Auto-increment primary key |
| `title` | varchar(200) | Notification title/heading |
| `message` | text | Full notification body text |
| `icon` | varchar(10) | Emoji icon shown with the notification |
| `type` | varchar(50) | Type tag e.g. "draw_started", "result_announced" |
| `is_active` | boolean | Whether this template is available for use |
| `created_at` | timestamp | Record creation timestamp |

**Relations:** Referenced by `notification_campaigns.template_id`

---

### 6. `rejection_reasons`

Standard reasons an admin can select when rejecting a KYC submission.

| Column | Type | Description |
|---|---|---|
| `id` | serial PK | Auto-increment primary key |
| `reason` | varchar(200) | Short rejection reason e.g. "Blurry Image" |
| `description` | text | Detailed explanation shown to the user |

**Relations:** Referenced by `kyc_review_log.reason_id`

---

### 7. `countries`

Master list of supported countries for user registration and document validation.

| Column | Type | Description |
|---|---|---|
| `id` | serial PK | Auto-increment primary key |
| `name` | varchar(100) | Full country name e.g. "India" |
| `code` | varchar(5) UNIQUE | ISO country code e.g. "IN", "US" |
| `currency` | varchar(10) | Primary currency code e.g. "INR", "USD" |
| `is_active` | boolean | Whether the platform accepts users from this country |

**Relations:** Referenced by `users.country_id`

---

### 8. `admin_roles`

Defines roles for admin panel users with their associated permission sets.

| Column | Type | Description |
|---|---|---|
| `id` | serial PK | Auto-increment primary key |
| `name` | varchar(100) UNIQUE | Role name e.g. "Super Admin", "Finance Manager" |
| `permissions` | jsonb | Array of permission strings e.g. `["users", "draws", "*"]` |
| `created_at` | timestamp | Record creation timestamp |

**Relations:** Referenced by `admins.role_id`

---

## 🟩 TIER 2 — Core Primary Tables

> These are the **main domain entity tables**. They reference Tier 1 tables.

---

### 9. `users`

The central table for all registered platform users.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | Unique user ID (auto-generated UUID) |
| `level_id` | integer FK → levels | Current level of the user (default: 1) |
| `country_id` | integer FK → countries | User's registered country |
| `name` | varchar(200) | Full display name |
| `email` | varchar(255) UNIQUE | Login email (indexed) |
| `phone` | varchar(20) UNIQUE | Mobile number with country code (indexed) |
| `password_hash` | varchar(255) | bcrypt hashed password |
| `avatar_url` | text | Profile picture URL (S3/CDN) |
| `points` | integer | Current active points balance |
| `total_points` | integer | Lifetime points earned (for level calculation) |
| `status` | enum | `active`, `suspended`, `banned`, `pending_verification` |
| `kyc_status` | enum | `not_submitted`, `pending`, `verified`, `rejected` |
| `mfa_enabled` | boolean | Whether MFA is turned on for this account |
| `mfa_secret` | varchar(100) | TOTP secret for authenticator app |
| `email_verified` | boolean | Whether email OTP was confirmed |
| `phone_verified` | boolean | Whether phone OTP was confirmed |
| `last_login_at` | timestamp | Last successful login time |
| `created_at` | timestamp | Account creation date |
| `updated_at` | timestamp | Last profile update |

**Indexes:** `email`, `phone`, `level_id`, `status`  
**Relations:** Parent of `wallets`, `tickets`, `transactions`, `referral_codes`, `kyc_submissions`, `user_sessions`, `points_history`, `referrals`

---

### 10. `admins`

Admin panel users who manage the platform. Separate from regular users.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | Unique admin ID |
| `role_id` | integer FK → admin_roles | Assigned role determining permissions |
| `name` | varchar(200) | Admin's full name |
| `email` | varchar(255) UNIQUE | Admin login email |
| `password_hash` | varchar(255) | bcrypt hashed password |
| `is_active` | boolean | Whether this admin account is active |
| `last_login_at` | timestamp | Last admin login timestamp |
| `created_at` | timestamp | Account creation date |

**Relations:** Parent of `draws.created_by`, `wallet_adjustments`, `kyc_review_log`, `audit_logs`, `admin_ip_whitelist`, `notification_campaigns`

---

### 11. `draws`

Each lottery draw event on the platform — the core product entity.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | Unique draw ID |
| `game_type_id` | integer FK → game_types | The category this draw belongs to |
| `created_by` | uuid FK → admins | Which admin created this draw |
| `name` | varchar(200) | Draw display name e.g. "Mega Millions #4821" |
| `prize_pool` | numeric(15,2) | Total prize amount in INR |
| `ticket_price` | numeric(10,2) | Price per ticket in INR |
| `max_entries` | integer | Maximum number of tickets that can be sold |
| `current_entries` | integer | Real-time count of tickets sold so far |
| `status` | enum | `draft`, `scheduled`, `live`, `completed`, `cancelled` |
| `draw_date` | timestamp | Exact date and time of the draw |
| `description` | text | Marketing description of the draw |
| `rng_seed_hash` | varchar(64) | SHA-256 hash of RNG seed (published before draw for transparency) |
| `is_guaranteed` | boolean | If true, prize is guaranteed regardless of ticket sales |
| `min_entries` | integer | Minimum tickets required or draw is cancelled |
| `created_at` | timestamp | Draw creation timestamp |
| `updated_at` | timestamp | Last modification timestamp |

**Indexes:** `status`, `draw_date`  
**Relations:** Parent of `tickets`, `draw_results`, `draw_winners`, `draw_eligible_levels`

---

### 12. `wallets`

One wallet per user, holding real money balance and bonus credits separately.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | Unique wallet ID |
| `user_id` | uuid FK → users UNIQUE | Owner user (one-to-one relationship) |
| `balance` | numeric(15,2) | Real money balance (withdrawable) |
| `bonus_balance` | numeric(15,2) | Bonus credits (non-withdrawable, tickets only) |
| `locked_amount` | numeric(15,2) | Amount locked pending withdrawal approval |
| `currency` | varchar(5) | Currency code, default "INR" |
| `updated_at` | timestamp | Last balance change timestamp |

**Relations:** Parent of `transactions`, `wallet_adjustments`, `prize_payouts`

---

### 13. `referral_codes`

Each user gets a unique shareable referral code for the referral program.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | Unique record ID |
| `user_id` | uuid FK → users UNIQUE | Owner of this referral code (one-to-one) |
| `code` | varchar(20) UNIQUE | The actual referral code e.g. "RAVI2024" (indexed) |
| `total_referrals` | integer | Count of successful referrals using this code |
| `total_earned` | numeric(12,2) | Total rewards earned through referrals |
| `created_at` | timestamp | Code creation timestamp |

**Relations:** Referenced by `referrals` when tracking who referred whom

---

### 14. `kyc_submissions`

Stores each KYC document submission made by a user.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | Unique submission ID |
| `user_id` | uuid FK → users | The user who submitted the documents |
| `doc_type_id` | integer FK → kyc_document_types | Type of document submitted |
| `doc_number` | varchar(100) | The document's ID number (masked/encrypted) |
| `front_url` | text | S3 URL of the document front image |
| `back_url` | text | S3 URL of the document back image (if applicable) |
| `selfie_url` | text | S3 URL of the selfie with document |
| `status` | enum | `pending`, `verified`, `rejected` |
| `submitted_at` | timestamp | When the user submitted the documents |
| `reviewed_at` | timestamp | When admin completed the review |

**Relations:** Parent of `kyc_review_log`

---

### 15. `notification_campaigns`

Admin-created notification blasts sent to users via push, email, or SMS.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | Unique campaign ID |
| `admin_id` | uuid FK → admins | Admin who created and sent the campaign |
| `template_id` | integer FK → notification_templates | Optional base template used |
| `title` | varchar(200) | Notification title |
| `message` | text | Full notification message body |
| `target_audience` | varchar(100) | Audience tag e.g. "all_users", "gold_plus" |
| `target_level_min` | integer | Minimum user level to receive this notification |
| `scheduled_at` | timestamp | If scheduled, when to send (null = immediate) |
| `sent_at` | timestamp | When the campaign was actually dispatched |
| `total_sent` | integer | Count of notifications dispatched |
| `total_opened` | integer | Count of notifications opened |
| `total_clicked` | integer | Count of click-throughs |
| `status` | enum | `draft`, `scheduled`, `sent`, `failed` |
| `created_at` | timestamp | Campaign creation timestamp |

**Relations:** Parent of `notifications_sent`, `user_notification_reads`, `campaign_channels`

---

## 🟨 TIER 3 — Junction / Relationship Tables

> These tables connect two entities together. They need both sides to exist first.

---

### 16. `draw_eligible_levels`

Controls which user levels are allowed to purchase tickets for a specific draw.

| Column | Type | Description |
|---|---|---|
| `draw_id` | uuid FK → draws | The draw being restricted |
| `level_id` | integer FK → levels | A level that is allowed to enter this draw |
| `created_at` | timestamp | When this rule was configured |

**Primary Key:** Composite `(draw_id, level_id)`  
**Why:** Allows VIP-only draws, Diamond+ exclusive events, etc. without duplicating draw records.

---

### 17. `user_notification_reads`

Tracks whether a specific user has read or clicked a specific campaign notification.

| Column | Type | Description |
|---|---|---|
| `user_id` | uuid FK → users | The user who received the notification |
| `campaign_id` | uuid FK → notification_campaigns | The campaign notification |
| `read_at` | timestamp | When user opened the notification |
| `clicked_at` | timestamp | When user clicked through (if applicable) |

**Primary Key:** Composite `(user_id, campaign_id)`  
**Why:** Powers the unread notification badge and open/click rate analytics.

---

### 18. `campaign_channels`

Breaks down delivery statistics for each channel (push, email, SMS) per campaign.

| Column | Type | Description |
|---|---|---|
| `campaign_id` | uuid FK → notification_campaigns | The campaign |
| `channel` | varchar(20) | Channel type: `push`, `email`, `sms` |
| `delivered_count` | integer | Successfully delivered via this channel |
| `failed_count` | integer | Failed deliveries via this channel |

**Primary Key:** Composite `(campaign_id, channel)`  
**Why:** One campaign can use multiple channels. This tracks per-channel performance separately.

---

### 19. `draw_winners`

Records the winner(s) of a completed draw.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | Unique winner record ID |
| `draw_id` | uuid FK → draws | The completed draw |
| `user_id` | uuid FK → users | The winning user |
| `prize_amount` | varchar(20) | Prize amount won |
| `paid_at` | timestamp | When the prize was credited |
| `payment_txn_id` | uuid | Reference to the payout transaction |
| `created_at` | timestamp | When the winner was declared |

**Index:** `(draw_id, user_id)`  
**Relations:** Parent of `prize_payouts`

---

### 20. `user_badges`

Awards and achievement badges earned by users through platform activity.

| Column | Type | Description |
|---|---|---|
| `user_id` | uuid FK → users | The user who earned the badge |
| `badge_id` | integer | Badge identifier (e.g., 1 = "First Ticket") |
| `earned_at` | timestamp | When the badge was awarded |
| `reason` | text | Human-readable reason the badge was awarded |

**Primary Key:** Composite `(user_id, badge_id)` — prevents duplicate badge awards.

---

### 21. `admin_ip_whitelist`

Security table listing approved IP addresses for each admin account.

| Column | Type | Description |
|---|---|---|
| `admin_id` | uuid FK → admins | The admin this IP belongs to |
| `ip_address` | varchar(45) | IPv4 or IPv6 address |
| `added_at` | timestamp | When this IP was whitelisted |
| `label` | varchar(100) | Friendly label e.g. "Office Primary IP" |

**Primary Key:** Composite `(admin_id, ip_address)`  
**Why:** Admin panel only accessible from pre-approved IPs — critical security control.

---

## 🟥 TIER 4 — Dependent / Child Tables

> These are **transaction and activity tables** — the highest-volume tables in the system.

---

### 22. `tickets`

Every lottery ticket purchased by a user for a specific draw.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | Unique ticket ID |
| `user_id` | uuid FK → users | Ticket owner |
| `draw_id` | uuid FK → draws | Which draw this ticket enters |
| `ticket_number` | varchar(50) UNIQUE | Human-readable ticket number e.g. "TKT-2024-000001" |
| `price_paid` | numeric(10,2) | Actual price paid after any level discount |
| `picked_numbers` | varchar(200) | Comma-separated numbers the user selected |
| `is_auto_pick` | boolean | Whether numbers were auto-selected by the system |
| `status` | enum | `active`, `used`, `expired`, `refunded` |
| `is_winner` | boolean | Set to true after draw if this ticket wins |
| `purchased_at` | timestamp | Ticket purchase timestamp |

**Indexes:** `(user_id, draw_id)`, `draw_id`, `ticket_number`  
**Scale:** Expected 50M+ rows — consider partitioning by `draw_id` at scale.

---

### 23. `transactions`

Complete financial ledger for all money movements across the platform.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | Unique transaction ID |
| `user_id` | uuid FK → users | User this transaction belongs to |
| `wallet_id` | uuid FK → wallets | Wallet that was debited/credited |
| `method_id` | integer FK → payment_methods | Payment method used (null for internal transfers) |
| `txn_ref` | varchar(100) UNIQUE | Internal transaction reference number |
| `amount` | numeric(15,2) | Transaction amount in INR |
| `type` | enum | `deposit`, `withdrawal`, `ticket_purchase`, `prize_payout`, `bonus_credit`, `referral_reward`, `manual_adjustment` |
| `status` | enum | `pending`, `success`, `failed`, `refunded` |
| `gateway_txn_id` | varchar(200) | Razorpay/Stripe transaction ID for reconciliation |
| `note` | text | Human-readable transaction description |
| `created_at` | timestamp | Transaction creation timestamp |

**Indexes:** `(user_id, created_at)`, `status`, `created_at`  
**Scale:** Expected 5M+ rows — partition by `created_at` month at scale.

---

### 24. `wallet_adjustments`

Audit trail for every manual wallet change made by an admin.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | Unique adjustment ID |
| `wallet_id` | uuid FK → wallets | Wallet that was adjusted |
| `admin_id` | uuid FK → admins | Admin who made the adjustment |
| `txn_id` | uuid FK → transactions | Linked transaction record |
| `type` | enum | `add` or `deduct` |
| `amount` | numeric(12,2) | Amount added or deducted |
| `reason` | varchar(200) | Required reason for the adjustment |
| `note` | text | Optional detailed notes |
| `created_at` | timestamp | When the adjustment was made |

**Why:** Every manual wallet change by admin is logged here for financial compliance and audit.

---

### 25. `referrals`

Tracks every referral relationship — who invited whom.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | Unique referral record ID |
| `referrer_user_id` | uuid FK → users | The user who shared the referral code |
| `referred_user_id` | uuid FK → users UNIQUE | The user who signed up using the code |
| `reward_given` | boolean | Whether the referrer has been rewarded |
| `completed_at` | timestamp | When the referral was completed (first purchase) |
| `created_at` | timestamp | When the referred user registered |

**Index:** `referrer_user_id`  
**Note:** `referred_user_id` is UNIQUE — a user can only be referred once.

---

### 26. `referral_rewards`

Records each reward payout triggered by a successful referral.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | Unique reward record ID |
| `referral_id` | uuid FK → referrals | The referral that triggered this reward |
| `transaction_id` | uuid FK → transactions | The wallet credit transaction |
| `amount` | numeric(10,2) | Reward amount credited |
| `type` | varchar(20) | `referrer` (invited friend) or `referee` (joined via code) |
| `paid_at` | timestamp | When the reward was credited |

---

### 27. `points_rules`

Configurable rules defining how many points each action earns.

| Column | Type | Description |
|---|---|---|
| `id` | integer PK | Auto-generated ID |
| `game_type_id` | integer FK → game_types | Restrict rule to a specific game type (null = all) |
| `action` | varchar(100) UNIQUE | Action key e.g. "ticket_purchase", "daily_login" |
| `points_value` | integer | Points awarded per occurrence |
| `description` | text | Human-readable rule explanation |
| `limit_per_day` | integer | Max times this rule can trigger per day (null = unlimited) |
| `is_active` | boolean | Whether this rule is currently active |

**Relations:** Referenced by `points_history.rule_id`

---

### 28. `points_history`

Every point earning or spending event for every user — the points ledger.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | Unique event ID |
| `user_id` | uuid FK → users | User who earned/spent the points |
| `rule_id` | integer FK → points_rules | Rule that triggered this points award |
| `points` | integer | Points amount (positive = earned, negative = spent) |
| `action` | varchar(100) | Action label e.g. "ticket_purchase", "referral_bonus" |
| `reference_id` | uuid | ID of the related record (ticket, draw, etc.) |
| `created_at` | timestamp | When the points were awarded |

**Index:** `(user_id, created_at)`  
**Scale:** Expected 10M+ rows — archive old records periodically.

---

### 29. `draw_results`

Official result declaration for each completed draw.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | Unique result record ID |
| `draw_id` | uuid FK → draws UNIQUE | The draw this result belongs to (one-to-one) |
| `winning_numbers` | varchar(200) | Comma-separated winning numbers |
| `total_tickets_sold` | integer | Final ticket count at draw close |
| `total_prize_paid` | numeric(15,2) | Total prize money distributed |
| `winners_count` | integer | Number of winning tickets |
| `rng_seed` | varchar(200) | Revealed RNG seed (published after draw for transparency) |
| `result_declared_at` | timestamp | Official result announcement timestamp |

**Why:** Kept separate from `draws` so the main draw record stays clean and results are immutable once inserted.

---

### 30. `kyc_review_log`

Every admin action taken on a KYC submission — approved, rejected, requested more info.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | Unique log entry ID |
| `submission_id` | uuid FK → kyc_submissions | The KYC submission being reviewed |
| `admin_id` | uuid FK → admins | Admin who took the action |
| `reason_id` | integer FK → rejection_reasons | Rejection reason (null if approved) |
| `action` | varchar(20) | `approved`, `rejected`, or `more_info_requested` |
| `notes` | text | Admin's internal notes on the decision |
| `reviewed_at` | timestamp | When the review was completed |

**Why:** Provides a full audit trail of every KYC decision for compliance and dispute resolution.

---

### 31. `notifications_sent`

Individual delivery record for each notification sent to each user.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | Unique delivery record ID |
| `campaign_id` | uuid FK → notification_campaigns | The parent campaign |
| `user_id` | uuid FK → users | Recipient user |
| `channel` | varchar(20) | Delivery channel: `push`, `email`, or `sms` |
| `status` | enum | `sent`, `delivered`, `failed`, `opened` |
| `sent_at` | timestamp | When dispatched |
| `opened_at` | timestamp | When user opened it (null if not opened) |

**Index:** `(campaign_id, user_id)`  
**Scale:** Expected 50M+ rows — use Redis queue for writes, async processing via SQS.

---

### 32. `audit_logs`

Immutable log of every significant action performed by any admin in the system.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | Unique log entry ID |
| `admin_id` | uuid FK → admins | Admin who performed the action |
| `action` | varchar(200) | Description of what was done |
| `target_type` | varchar(100) | Entity type affected e.g. "user", "draw", "kyc_submission" |
| `target_id` | varchar(100) | ID of the affected record |
| `old_value` | text | JSON snapshot of data before the change |
| `new_value` | text | JSON snapshot of data after the change |
| `ip_address` | varchar(45) | IP address of the admin session |
| `created_at` | timestamp | Exact timestamp of the action |

**Index:** `(admin_id, created_at)`  
**Why:** Required for PCI-DSS and regulatory compliance. Records must be immutable — no UPDATE or DELETE allowed on this table.

---

### 33. `user_sessions`

Active login sessions for all users across web and mobile apps.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | Unique session ID |
| `user_id` | uuid FK → users | Session owner |
| `token` | varchar(500) UNIQUE | JWT refresh token (indexed for fast lookup) |
| `device_type` | varchar(50) | `web`, `android`, or `ios` |
| `ip_address` | varchar(45) | IP at time of login |
| `expires_at` | timestamp | Token expiry timestamp (30 days from creation) |
| `created_at` | timestamp | Session creation timestamp |

**Indexes:** `token` (hash), `user_id`  
**Why:** Used to validate refresh tokens and invalidate sessions on logout or security events. Redis caches active sessions for performance.

---

### 34. `prize_payouts`

Tracks the complete payout lifecycle for each draw winner.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | Unique payout record ID |
| `winner_id` | uuid FK → draw_winners | The winning entry record |
| `wallet_id` | uuid FK → wallets | Winner's wallet receiving the prize |
| `transaction_id` | uuid FK → transactions | The financial transaction record |
| `amount` | numeric(15,2) | Gross prize amount before tax |
| `tax_deducted` | numeric(10,2) | TDS deducted (30% for winnings > ₹10,000 per IT Act) |
| `net_amount` | numeric(15,2) | Final amount credited to wallet after TDS |
| `status` | enum | `pending`, `success`, `failed`, `refunded` |
| `paid_at` | timestamp | When prize was credited to wallet |
| `created_at` | timestamp | Record creation timestamp |

**Why:** Separates the prize payout concern from generic transactions — enables TDS tracking, prize reconciliation, and compliance reporting.

---

## 🔗 Table Relationships — Visual Map

```
countries ──────────────────────────────────────────────┐
levels ──────────────────────────────────────────────── users ──── wallets ──── transactions ──── referral_rewards
admin_roles ──── admins ──── draws ──── tickets                │               │
                    │         │                                 │               └── wallet_adjustments
                    │         └── draw_results                  │
                    │         └── draw_eligible_levels ── levels│
                    │         └── draw_winners ── prize_payouts │
                    │                                           │
                    ├── notification_campaigns ─── notifications_sent
                    │           │                └── user_notification_reads
                    │           └── campaign_channels
                    │
                    ├── kyc_review_log ──── kyc_submissions ──── kyc_document_types
                    │                  └── rejection_reasons
                    │
                    └── audit_logs
                    └── admin_ip_whitelist

users ──── referral_codes
users ──── referrals ──── referral_rewards
users ──── points_history ──── points_rules ──── game_types
users ──── user_badges
users ──── user_sessions
users ──── kyc_submissions
```

---

## 📊 Scale Estimates (Year 1)

| Table | Expected Rows | Notes |
|---|---|---|
| `users` | 1,000,000 | 1M registered users |
| `tickets` | 50,000,000 | Avg 50 tickets/user |
| `transactions` | 5,000,000 | Deposits + purchases + payouts |
| `points_history` | 10,000,000 | Multiple events per user |
| `notifications_sent` | 50,000,000 | Bulk campaigns |
| `user_sessions` | 2,000,000 | Active sessions |
| `audit_logs` | 500,000 | Admin actions |
| Master tables | < 1,000 each | Static reference data |

---

## 🔒 Security Notes

- **Never** allow `UPDATE` or `DELETE` on `audit_logs` — it must be append-only
- `kyc_submissions` document URLs must use **signed S3 URLs** expiring in 15 minutes
- `user_sessions.token` should additionally be stored in **Redis** for sub-millisecond validation
- `admins` access is restricted to IPs listed in `admin_ip_whitelist`
- All `password_hash` values must use **bcrypt with cost factor ≥ 12**
- `draws.rng_seed_hash` must be published **before** the draw and revealed **after** to prove fairness

---

## 📋 Seed Execution Order

The seed file must insert rows in this exact order to satisfy foreign key constraints:

```
1.  levels               (no deps)
2.  game_types           (no deps)
3.  payment_methods      (no deps)
4.  kyc_document_types   (no deps)
5.  notification_templates (no deps)
6.  rejection_reasons    (no deps)
7.  countries            (no deps)
8.  admin_roles          (no deps)
9.  users                (needs: levels, countries)
10. admins               (needs: admin_roles)
11. draws                (needs: game_types, admins)
12. wallets              (needs: users)
13. referral_codes       (needs: users)
14. kyc_submissions      (needs: users, kyc_document_types)
15. notification_campaigns (needs: admins, notification_templates)
16. draw_eligible_levels (needs: draws, levels)
17. user_notification_reads (needs: users, notification_campaigns)
18. campaign_channels    (needs: notification_campaigns)
19. draw_winners         (needs: draws, users)
20. user_badges          (needs: users)
21. admin_ip_whitelist   (needs: admins)
22. tickets              (needs: users, draws)
23. transactions         (needs: users, wallets, payment_methods)
24. wallet_adjustments   (needs: wallets, admins, transactions)
25. referrals            (needs: users x2)
26. referral_rewards     (needs: referrals, transactions)
27. points_rules         (needs: game_types)
28. points_history       (needs: users, points_rules)
29. draw_results         (needs: draws)
30. kyc_review_log       (needs: kyc_submissions, admins, rejection_reasons)
31. notifications_sent   (needs: notification_campaigns, users)
32. audit_logs           (needs: admins)
33. user_sessions        (needs: users)
34. prize_payouts        (needs: draw_winners, wallets, transactions)
```

---

## 🛠️ Common Drizzle Query Examples

```ts
import { db } from './src/db/index';
import { users, wallets, draws, tickets } from './src/db/schema/index';
import { eq, and, gte } from 'drizzle-orm';

// Get user with their wallet balance
const user = await db.query.users.findFirst({
  where: eq(users.email, 'ravi.kumar@example.com'),
  with: { wallets: true },
});

// Get all live draws
const liveDraws = await db
  .select()
  .from(draws)
  .where(eq(draws.status, 'live'));

// Get user's tickets for a draw
const userTickets = await db
  .select()
  .from(tickets)
  .where(and(
    eq(tickets.userId, user.id),
    eq(tickets.drawId, 'draw-uuid-here')
  ));

// Get users at Gold level or above (level 4+)
const goldPlusUsers = await db
  .select()
  .from(users)
  .where(gte(users.levelId, 4));
```

---

*Generated for Lottery Network Platform — Enterprise Backend v1.0*