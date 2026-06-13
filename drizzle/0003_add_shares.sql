CREATE TABLE "shares" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "shares" ADD CONSTRAINT "shares_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "shares_user_id_idx" ON "shares" USING btree ("user_id");