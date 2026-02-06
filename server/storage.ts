
import { db } from "./db";
import {
  sites,
  history,
  type Site,
  type InsertSite,
  type UpdateSiteRequest,
  type History,
  type InsertHistory,
  type UpdateHistoryRequest
} from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  getSites(): Promise<Site[]>;
  getSite(id: number): Promise<Site | undefined>;
  createSite(site: InsertSite): Promise<Site>;
  updateSite(id: number, updates: UpdateSiteRequest): Promise<Site>;
  deleteSite(id: number): Promise<void>;
  resetAllTurnover(): Promise<void>;
  // History
  getHistory(): Promise<History[]>;
  createHistory(entry: InsertHistory): Promise<History>;
  updateHistory(id: number, updates: UpdateHistoryRequest): Promise<History>;
  deleteHistory(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getSites(): Promise<Site[]> {
    return await db.select().from(sites).orderBy(sites.id);
  }

  async getSite(id: number): Promise<Site | undefined> {
    const [site] = await db.select().from(sites).where(eq(sites.id, id));
    return site;
  }

  async createSite(insertSite: InsertSite): Promise<Site> {
    const [site] = await db.insert(sites).values(insertSite).returning();
    return site;
  }

  async updateSite(id: number, updates: UpdateSiteRequest): Promise<Site> {
    const [site] = await db
      .update(sites)
      .set(updates)
      .where(eq(sites.id, id))
      .returning();
    return site;
  }

  async deleteSite(id: number): Promise<void> {
    await db.delete(sites).where(eq(sites.id, id));
  }

  async resetAllTurnover(): Promise<void> {
    await db.update(sites).set({ 
      currentTurnover: '0',
      targetTurnover: '0',
      remainingBalance: null
    });
  }

  async getHistory(): Promise<History[]> {
    return await db.select().from(history).orderBy(history.createdAt);
  }

  async createHistory(entry: InsertHistory): Promise<History> {
    const [record] = await db.insert(history).values(entry).returning();
    return record;
  }

  async updateHistory(id: number, updates: UpdateHistoryRequest): Promise<History> {
    const [record] = await db
      .update(history)
      .set(updates)
      .where(eq(history.id, id))
      .returning();
    return record;
  }

  async deleteHistory(id: number): Promise<void> {
    await db.delete(history).where(eq(history.id, id));
  }
}

export const storage = new DatabaseStorage();
