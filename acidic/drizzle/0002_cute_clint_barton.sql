CREATE TABLE "recipe_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipe_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"ingredient" text NOT NULL,
	"quantity" numeric(10, 2),
	"unit" text,
	"item_id" uuid,
	"note" text,
	CONSTRAINT "recipe_lines_unit_valid" CHECK ("recipe_lines"."unit" IS NULL OR "recipe_lines"."unit" IN ('ml', 'dash', 'bar_spoon', 'each', 'slice', 'wedge', 'leaf', 'pinch', 'top_up', 'rinse')),
	CONSTRAINT "recipe_lines_quantity_valid" CHECK ("recipe_lines"."quantity" IS NULL OR "recipe_lines"."quantity" >= 0)
);
--> statement-breakpoint
CREATE TABLE "recipes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"kind" text DEFAULT 'house' NOT NULL,
	"family" text,
	"glass" text,
	"method" text DEFAULT 'none' NOT NULL,
	"method_note" text,
	"garnish" text,
	"menu_price" numeric(12, 2),
	"notes" text,
	"active" integer DEFAULT 1 NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recipes_kind_valid" CHECK ("recipes"."kind" IN ('house', 'classic')),
	CONSTRAINT "recipes_method_valid" CHECK ("recipes"."method" IN ('shake', 'dry_then_wet_shake', 'stir', 'build', 'roll', 'throw', 'blend', 'hot', 'none')),
	CONSTRAINT "recipes_price_valid" CHECK ("recipes"."menu_price" IS NULL OR "recipes"."menu_price" >= 0)
);
--> statement-breakpoint
ALTER TABLE "stock_items" DROP CONSTRAINT "stock_items_category_valid";--> statement-breakpoint
ALTER TABLE "stock_items" DROP CONSTRAINT "stock_items_unit_valid";--> statement-breakpoint
ALTER TABLE "recipe_lines" ADD CONSTRAINT "recipe_lines_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_lines" ADD CONSTRAINT "recipe_lines_item_id_stock_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."stock_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recipe_lines_recipe_idx" ON "recipe_lines" USING btree ("recipe_id","position");--> statement-breakpoint
CREATE INDEX "recipe_lines_item_idx" ON "recipe_lines" USING btree ("item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "recipes_name_unique" ON "recipes" USING btree ("name");--> statement-breakpoint
ALTER TABLE "stock_items" ADD CONSTRAINT "stock_items_category_valid" CHECK ("stock_items"."category" IN ('coffee', 'tea', 'beer', 'wine', 'sake', 'spirits', 'liqueur', 'bitters', 'mixers', 'juice', 'syrup', 'produce', 'milk_dairy', 'food', 'packaging', 'other'));--> statement-breakpoint
ALTER TABLE "stock_items" ADD CONSTRAINT "stock_items_unit_valid" CHECK ("stock_items"."unit" IN ('each', 'bottle', 'can', 'keg', 'kg', 'gram', 'litre', 'carton', 'pack'));