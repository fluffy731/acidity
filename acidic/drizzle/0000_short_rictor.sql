CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid NOT NULL,
	"entity" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"action" text NOT NULL,
	"detail_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_date" date NOT NULL,
	"title" text NOT NULL,
	"artist" text,
	"genre" text,
	"kind" text DEFAULT 'night_session' NOT NULL,
	"status" text DEFAULT 'placeholder' NOT NULL,
	"start_time" text,
	"end_time" text,
	"ticket_url" text,
	"price_from" numeric(12, 2),
	"price_to" numeric(12, 2),
	"description" text,
	"staff_required" integer DEFAULT 2 NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "events_kind_valid" CHECK ("events"."kind" IN ('night_session', 'day_programme', 'private_booking')),
	CONSTRAINT "events_status_valid" CHECK ("events"."status" IN ('placeholder', 'confirmed', 'ticketed', 'free_rsvp', 'private', 'cancelled')),
	CONSTRAINT "events_staff_required_valid" CHECK ("events"."staff_required" >= 0),
	CONSTRAINT "events_price_valid" CHECK (("events"."price_from" IS NULL OR "events"."price_from" >= 0) AND ("events"."price_to" IS NULL OR "events"."price_to" >= 0)),
	CONSTRAINT "events_ticket_link_consistent" CHECK ("events"."ticket_url" IS NULL OR "events"."status" IN ('ticketed', 'free_rsvp'))
);
--> statement-breakpoint
CREATE TABLE "ledger_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entry_date" date NOT NULL,
	"kind" text NOT NULL,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	"gst" numeric(12, 2) NOT NULL,
	"subtotal" numeric(12, 2) NOT NULL,
	"gst_free" integer DEFAULT 0 NOT NULL,
	"payment_method" text,
	"event_id" uuid,
	"reference" text,
	"voided_at" timestamp with time zone,
	"void_reason" text,
	"recorded_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ledger_entries_kind_valid" CHECK ("ledger_entries"."kind" IN ('income', 'expense', 'wages')),
	CONSTRAINT "ledger_entries_category_valid" CHECK ("ledger_entries"."category" IN ('bar_takings', 'coffee_takings', 'ticket_sales', 'venue_hire', 'other_income', 'stock_purchase', 'rent', 'utilities', 'wages_payment', 'artist_fee', 'marketing', 'equipment', 'cleaning', 'fees_and_charges', 'other_expense')),
	CONSTRAINT "ledger_entries_payment_valid" CHECK ("ledger_entries"."payment_method" IS NULL OR "ledger_entries"."payment_method" IN ('card', 'cash', 'bank_transfer', 'ticket_platform')),
	CONSTRAINT "ledger_entries_nonnegative" CHECK ("ledger_entries"."total" >= 0 AND "ledger_entries"."gst" >= 0 AND "ledger_entries"."subtotal" >= 0),
	CONSTRAINT "ledger_entries_split_consistent" CHECK ("ledger_entries"."subtotal" + "ledger_entries"."gst" = "ledger_entries"."total"),
	CONSTRAINT "ledger_entries_gst_free_consistent" CHECK (("ledger_entries"."gst_free" = 1 AND "ledger_entries"."gst" = 0) OR "ledger_entries"."gst_free" = 0),
	CONSTRAINT "ledger_entries_void_consistent" CHECK (("ledger_entries"."voided_at" IS NULL AND "ledger_entries"."void_reason" IS NULL) OR ("ledger_entries"."voided_at" IS NOT NULL AND "ledger_entries"."void_reason" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "shifts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"staff_id" uuid NOT NULL,
	"shift_date" date NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"role" text NOT NULL,
	"status" text DEFAULT 'rostered' NOT NULL,
	"break_minutes" integer DEFAULT 0 NOT NULL,
	"note" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shifts_role_valid" CHECK ("shifts"."role" IN ('barista', 'bartender', 'floor', 'sound', 'manager')),
	CONSTRAINT "shifts_status_valid" CHECK ("shifts"."status" IN ('rostered', 'confirmed', 'worked', 'no_show', 'cancelled')),
	CONSTRAINT "shifts_break_valid" CHECK ("shifts"."break_minutes" >= 0)
);
--> statement-breakpoint
CREATE TABLE "staff_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"default_role" text NOT NULL,
	"employment_type" text NOT NULL,
	"hourly_rate" numeric(12, 2) NOT NULL,
	"user_id" uuid,
	"active" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "staff_members_role_valid" CHECK ("staff_members"."default_role" IN ('barista', 'bartender', 'floor', 'sound', 'manager')),
	CONSTRAINT "staff_members_employment_valid" CHECK ("staff_members"."employment_type" IN ('casual', 'part_time', 'full_time', 'contractor')),
	CONSTRAINT "staff_members_rate_valid" CHECK ("staff_members"."hourly_rate" >= 0)
);
--> statement-breakpoint
CREATE TABLE "stock_count_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"count_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"quantity" numeric(10, 2) NOT NULL,
	CONSTRAINT "stock_count_lines_quantity_valid" CHECK ("stock_count_lines"."quantity" >= 0)
);
--> statement-breakpoint
CREATE TABLE "stock_counts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"count_date" date NOT NULL,
	"note" text,
	"counted_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"unit" text NOT NULL,
	"unit_cost" numeric(12, 2) NOT NULL,
	"par_level" numeric(10, 2) DEFAULT '0' NOT NULL,
	"supplier" text,
	"active" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stock_items_category_valid" CHECK ("stock_items"."category" IN ('coffee', 'beer', 'wine', 'sake', 'spirits', 'mixers', 'milk_dairy', 'food', 'packaging', 'other')),
	CONSTRAINT "stock_items_unit_valid" CHECK ("stock_items"."unit" IN ('each', 'bottle', 'keg', 'kg', 'litre', 'carton', 'pack')),
	CONSTRAINT "stock_items_cost_valid" CHECK ("stock_items"."unit_cost" >= 0 AND "stock_items"."par_level" >= 0)
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"movement_date" date NOT NULL,
	"kind" text NOT NULL,
	"quantity" numeric(10, 2) NOT NULL,
	"note" text,
	"recorded_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stock_movements_kind_valid" CHECK ("stock_movements"."kind" IN ('delivery', 'waste', 'adjustment')),
	CONSTRAINT "stock_movements_quantity_valid" CHECK ("stock_movements"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text,
	"role" text DEFAULT 'staff' NOT NULL,
	"failed_login_attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_role_valid" CHECK ("users"."role" IN ('owner', 'manager', 'staff'))
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_staff_id_staff_members_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff_members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_members" ADD CONSTRAINT "staff_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_count_lines" ADD CONSTRAINT "stock_count_lines_count_id_stock_counts_id_fk" FOREIGN KEY ("count_id") REFERENCES "public"."stock_counts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_count_lines" ADD CONSTRAINT "stock_count_lines_item_id_stock_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."stock_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_counts" ADD CONSTRAINT "stock_counts_counted_by_users_id_fk" FOREIGN KEY ("counted_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_item_id_stock_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."stock_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_entity_idx" ON "audit_log" USING btree ("entity","entity_id","created_at");--> statement-breakpoint
CREATE INDEX "events_date_idx" ON "events" USING btree ("event_date");--> statement-breakpoint
CREATE INDEX "ledger_entries_date_idx" ON "ledger_entries" USING btree ("entry_date");--> statement-breakpoint
CREATE INDEX "ledger_entries_kind_date_idx" ON "ledger_entries" USING btree ("kind","entry_date");--> statement-breakpoint
CREATE INDEX "shifts_date_idx" ON "shifts" USING btree ("shift_date");--> statement-breakpoint
CREATE INDEX "shifts_staff_date_idx" ON "shifts" USING btree ("staff_id","shift_date");--> statement-breakpoint
CREATE UNIQUE INDEX "stock_count_lines_unique" ON "stock_count_lines" USING btree ("count_id","item_id");--> statement-breakpoint
CREATE INDEX "stock_counts_date_idx" ON "stock_counts" USING btree ("count_date");--> statement-breakpoint
CREATE UNIQUE INDEX "stock_items_name_unique" ON "stock_items" USING btree ("name");--> statement-breakpoint
CREATE INDEX "stock_movements_item_date_idx" ON "stock_movements" USING btree ("item_id","movement_date");