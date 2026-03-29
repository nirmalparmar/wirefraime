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

// ── Relations ────────────────────────────────────────────────
export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
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
