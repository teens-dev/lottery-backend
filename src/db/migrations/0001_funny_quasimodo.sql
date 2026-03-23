CREATE TYPE "public"."user_role" AS ENUM('admin', 'user');--> statement-breakpoint
ALTER TABLE "admins" ADD COLUMN "role" "user_role" DEFAULT 'admin' NOT NULL;--> statement-breakpoint
ALTER TABLE "draws" ADD COLUMN "draw_start_date" timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE "draws" ADD COLUMN "draw_end_date" timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" "user_role" DEFAULT 'user' NOT NULL;