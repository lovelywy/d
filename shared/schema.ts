
import { pgTable, text, serial, boolean, numeric, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

export const sites = pgTable("sites", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  depositRate: numeric("deposit_rate").notNull(),
  bonusPercent: numeric("bonus_percent").notNull(),
  targetTurnover: numeric("target_turnover").default('0'),
  currentTurnover: numeric("current_turnover").default('0'),
  existingBalance: numeric("existing_balance").default('0'),
  remainingBalance: numeric("remaining_balance"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const bonusSites = pgTable("bonus_sites", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  bonusPercent: numeric("bonus_percent").notNull(),
  maxBonusAmount: numeric("max_bonus_amount").notNull(),
  turnoverMultiplier: numeric("turnover_multiplier").notNull(),
  depositRate: numeric("deposit_rate").notNull(),
  targetTurnover: numeric("target_turnover").default('0'),
  currentTurnover: numeric("current_turnover").default('0'),
  remainingBalance: numeric("remaining_balance"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const history = pgTable("history", {
  id: serial("id").primaryKey(),
  userName: text("user_name").default(""),
  initialThb: numeric("initial_thb").notNull(),
  totalUsdt: numeric("total_usdt").notNull(),
  profit: numeric("profit").notNull(),
  details: jsonb("details").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// === BASE SCHEMAS ===
export const insertSiteSchema = createInsertSchema(sites).omit({ 
  id: true, 
  createdAt: true 
});

export const insertBonusSiteSchema = createInsertSchema(bonusSites).omit({
  id: true,
  createdAt: true
});

export const insertHistorySchema = createInsertSchema(history).omit({
  id: true,
  createdAt: true
});

// === EXPLICIT API CONTRACT TYPES ===

export type Site = typeof sites.$inferSelect;
export type InsertSite = z.infer<typeof insertSiteSchema>;
export type UpdateSiteRequest = Partial<InsertSite> & { remainingBalance?: string | null };

export type BonusSite = typeof bonusSites.$inferSelect;
export type InsertBonusSite = z.infer<typeof insertBonusSiteSchema>;
export type UpdateBonusSiteRequest = Partial<InsertBonusSite> & { remainingBalance?: string | null };

export type History = typeof history.$inferSelect;
export type InsertHistory = z.infer<typeof insertHistorySchema>;
export type UpdateHistoryRequest = Partial<Omit<InsertHistory, 'details'>> & { userName?: string | null };
