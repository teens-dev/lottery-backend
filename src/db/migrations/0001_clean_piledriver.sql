CREATE TYPE "public"."game_type_enum" AS ENUM('lottery', 'level');--> statement-breakpoint
CREATE TYPE "public"."entry_status" AS ENUM('active', 'paid');--> statement-breakpoint
CREATE TYPE "public"."pool_status" AS ENUM('filling', 'completed');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'user');--> statement-breakpoint
CREATE TYPE "public"."withdrawal_status" AS ENUM('pending', 'success', 'failed');--> statement-breakpoint
CREATE TYPE "public"."payment_order_status" AS ENUM('pending', 'success', 'failed');--> statement-breakpoint
CREATE TABLE "level_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"game_type_id" integer NOT NULL,
	"pool_id" uuid NOT NULL,
	"level" integer NOT NULL,
	"amount_paid" numeric(10, 2) NOT NULL,
	"status" "entry_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "level_pools" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_type_id" integer NOT NULL,
	"level" integer NOT NULL,
	"required_count" integer NOT NULL,
	"current_count" integer DEFAULT 0 NOT NULL,
	"status" "pool_status" DEFAULT 'filling' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "withdrawals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"status" "withdrawal_status" DEFAULT 'pending' NOT NULL,
	"upi_id" varchar(100),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payment_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"razorpay_order_id" varchar(100) NOT NULL,
	"status" "payment_order_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "payment_orders_razorpay_order_id_unique" UNIQUE("razorpay_order_id")
);
--> statement-breakpoint
CREATE TABLE "user_bank_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"account_number" varchar(25) NOT NULL,
	"ifsc" varchar(15) NOT NULL,
	"upi_id" varchar(100),
	"is_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "tickets" DROP CONSTRAINT "tickets_ticket_number_unique";--> statement-breakpoint
ALTER TABLE "game_types" ADD COLUMN "entry_fee" numeric(10, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "game_types" ADD COLUMN "commission_rate" numeric(5, 2) DEFAULT '0.10' NOT NULL;--> statement-breakpoint
ALTER TABLE "game_types" ADD COLUMN "type" "game_type_enum" NOT NULL;--> statement-breakpoint
ALTER TABLE "admins" ADD COLUMN "role" "user_role" DEFAULT 'admin' NOT NULL;--> statement-breakpoint
ALTER TABLE "draws" ADD COLUMN "draw_start_date" timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE "draws" ADD COLUMN "draw_end_date" timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" "user_role" DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE "level_entries" ADD CONSTRAINT "level_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "level_entries" ADD CONSTRAINT "level_entries_game_type_id_game_types_id_fk" FOREIGN KEY ("game_type_id") REFERENCES "public"."game_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "level_entries" ADD CONSTRAINT "level_entries_pool_id_level_pools_id_fk" FOREIGN KEY ("pool_id") REFERENCES "public"."level_pools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "level_pools" ADD CONSTRAINT "level_pools_game_type_id_game_types_id_fk" FOREIGN KEY ("game_type_id") REFERENCES "public"."game_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_bank_accounts" ADD CONSTRAINT "user_bank_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payment_orders_user_idx" ON "payment_orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "payment_orders_rzp_order_idx" ON "payment_orders" USING btree ("razorpay_order_id");--> statement-breakpoint
CREATE INDEX "payment_orders_status_idx" ON "payment_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "user_bank_accounts_user_idx" ON "user_bank_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_bank_accounts_verified_idx" ON "user_bank_accounts" USING btree ("user_id","is_verified");--> statement-breakpoint
CREATE UNIQUE INDEX "tickets_user_draw_ticket_idx" ON "tickets" USING btree ("draw_id","ticket_number");