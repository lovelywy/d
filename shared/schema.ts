
import { pgTable, text, serial, boolean, numeric, timestamp } from "drizzle-orm/pg-core";
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
  allocationPercent: numeric("allocation_percent").default('0'),
  existingBalance: numeric("existing_balance").default('0'),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// === BASE SCHEMAS ===
export const insertSiteSchema = createInsertSchema(sites).omit({ 
  id: true, 
  createdAt: true 
});

// === EXPLICIT API CONTRACT TYPES ===

export type Site = typeof sites.$inferSelect;
export type InsertSite = z.infer<typeof insertSiteSchema>;

export type CreateSiteRequest = InsertSite;
export type UpdateSiteRequest = Partial<InsertSite>;

export type SiteResponse = Site;
export type SitesListResponse = Site[];

export interface BinancePriceResponse {
  symbol: string;
  price: string;
}
