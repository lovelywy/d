
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
  remainingBalance: numeric("remaining_balance").default('0'), // ยอดเงินคงเหลือหลังเล่น
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const history = pgTable("history", {
  id: serial("id").primaryKey(),
  initialThb: numeric("initial_thb").notNull(),
  totalUsdt: numeric("total_usdt").notNull(),
  profit: numeric("profit").notNull(),
  details: jsonb("details").notNull(), // JSON containing site names, rates, etc.
  createdAt: timestamp("created_at").defaultNow(),
});

// === BASE SCHEMAS ===
export const insertSiteSchema = createInsertSchema(sites).omit({ 
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

export type History = typeof history.$inferSelect;
export type InsertHistory = z.infer<typeof insertHistorySchema>;

export interface BinancePriceResponse {
  symbol: string;
  price: string;
}
