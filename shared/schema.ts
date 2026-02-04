
import { pgTable, text, serial, integer, boolean, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

// Stores the configuration for each gambling site
export const sites = pgTable("sites", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  depositRate: numeric("deposit_rate").notNull(), // Custom THB per USDT rate
  bonusPercent: numeric("bonus_percent").notNull(), // Bonus percentage (e.g. 10)
  targetTurnover: numeric("target_turnover").default('0'), // Calculated target
  currentTurnover: numeric("current_turnover").default('0'), // Amount bet so far
  allocationPercent: numeric("allocation_percent").default('0'), // Percentage of capital to allocate (0 = auto/equal split)
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

// Request types
export type CreateSiteRequest = InsertSite;
export type UpdateSiteRequest = Partial<InsertSite>;

// Response types
export type SiteResponse = Site;
export type SitesListResponse = Site[];

// Binance API Response Type (for type safety on backend)
export interface BinancePriceResponse {
  symbol: string;
  price: string;
}
