-- v2 design engine tables (DESIGN-ENGINE-PLAN.md Phase B)
-- Applied directly (bun scripts/apply-migration.ts) — drizzle-kit journal is broken.

CREATE TABLE IF NOT EXISTS "ds_projects" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "clerk_user_id" text,
  "name" text NOT NULL,
  "prompt" text DEFAULT '' NOT NULL,
  "theme" jsonb NOT NULL,
  "status" text DEFAULT 'generating' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "ds_screens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "name" text NOT NULL,
  "purpose" text DEFAULT '' NOT NULL,
  "html" text DEFAULT '' NOT NULL,
  "source" text DEFAULT 'designer' NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "ds_screens" ADD CONSTRAINT "ds_screens_project_id_ds_projects_id_fk"
    FOREIGN KEY ("project_id") REFERENCES "ds_projects"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "ds_projects_clerk_user_id_idx" ON "ds_projects" ("clerk_user_id");
CREATE INDEX IF NOT EXISTS "ds_screens_project_id_idx" ON "ds_screens" ("project_id");
