import { pgTable, uuid, text, timestamp, integer, jsonb, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ── Users ────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  clerkId: text("clerk_id").unique().notNull(),
  email: text("email"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  avatarUrl: text("avatar_url"),
  plan: text("plan").default("free").notNull(),
  subscriptionId: text("subscription_id"),
  /** Dodo customer ID — captured from webhook payload. Lets us open the
   *  customer portal directly and survives subscription churn (cancel +
   *  resubscribe creates a new sub_id but the same cus_id). */
  dodoCustomerId: text("dodo_customer_id"),
  subscriptionStatus: text("subscription_status").default("inactive").notNull(),
  screensUsed: integer("screens_used").default(0).notNull(),
  usageResetAt: timestamp("usage_reset_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ── Projects ─────────────────────────────────────────────────
export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  platform: text("platform").notNull().default("web"),  // "web" | "mobile" | "tablet"
  designSystem: jsonb("design_system"),                   // DesignSystem JSON
  designSystemId: text("design_system_id"),               // brand package id; null = AI-generated
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("projects_user_id_idx").on(t.userId),
]);

// ── Screens (HTML lives in S3, metadata here) ────────────────
export const screens = pgTable("screens", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  storageKey: text("storage_key"),   // S3 key: {userId}/{projectId}/screens/{screenId}.html
  htmlSize: integer("html_size").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("screens_project_id_idx").on(t.projectId),
]);

// ── Messages (chat history per project) ──────────────────────
export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  role: text("role").notNull(),           // "user" | "assistant"
  content: text("content").notNull().default(""),
  image: text("image"),                    // base64 data URL or storage URL
  agentSteps: jsonb("agent_steps"),        // AgentStep[] JSON
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("messages_project_id_idx").on(t.projectId),
]);

// ── Shares (public preview snapshots) ────────────────────────
// A self-contained snapshot of a WireframeApp (incl. each screen's HTML) taken
// at share time and stored as jsonb. Lives in Postgres — NOT on the local disk
// — so a public /preview/{id} link renders for anyone, on any serverless
// instance, and survives cold starts and redeploys.
export const shares = pgTable("shares", {
  id: text("id").primaryKey(),                 // share code (random base36)
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  data: jsonb("data").notNull(),               // WireframeApp snapshot
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("shares_user_id_idx").on(t.userId),
]);

// ═══ v2 design engine (DESIGN-ENGINE-PLAN.md) ════════════════
// Screens are plain HTML fragments stored as text IN the DB (plan §1.1)
// — no S3, no IR. Kept separate from the legacy tables above so the old
// app keeps working while v2 is built out.

export const dsProjects = pgTable("ds_projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  /** Clerk user id; nullable so /dev flows work before auth (Phase D wires quotas). */
  clerkUserId: text("clerk_user_id"),
  name: text("name").notNull(),
  prompt: text("prompt").notNull().default(""),
  theme: jsonb("theme").notNull(),               // Theme (lib/ds) — clamped before write
  status: text("status").notNull().default("generating"), // "generating" | "ready" | "error"
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("ds_projects_clerk_user_id_idx").on(t.clerkUserId),
]);

export const dsScreens = pgTable("ds_screens", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => dsProjects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  purpose: text("purpose").notNull().default(""),
  html: text("html").notNull().default(""),      // sanitized fragment — the artifact itself
  source: text("source").notNull().default("designer"), // designer | designer-retry | fast | placeholder
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("ds_screens_project_id_idx").on(t.projectId),
]);

export const dsProjectsRelations = relations(dsProjects, ({ many }) => ({
  screens: many(dsScreens),
}));

export const dsScreensRelations = relations(dsScreens, ({ one }) => ({
  project: one(dsProjects, { fields: [dsScreens.projectId], references: [dsProjects.id] }),
}));

// ── Relations ────────────────────────────────────────────────
export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
  shares: many(shares),
}));

export const sharesRelations = relations(shares, ({ one }) => ({
  user: one(users, { fields: [shares.userId], references: [users.id] }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, { fields: [projects.userId], references: [users.id] }),
  screens: many(screens),
  messages: many(messages),
}));

export const screensRelations = relations(screens, ({ one }) => ({
  project: one(projects, { fields: [screens.projectId], references: [projects.id] }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  project: one(projects, { fields: [messages.projectId], references: [projects.id] }),
}));
