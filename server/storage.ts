
import { db } from "./db";
import {
  sites,
  type Site,
  type InsertSite,
  type UpdateSiteRequest
} from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Sites CRUD
  getSites(): Promise<Site[]>;
  getSite(id: number): Promise<Site | undefined>;
  createSite(site: InsertSite): Promise<Site>;
  updateSite(id: number, updates: UpdateSiteRequest): Promise<Site>;
  deleteSite(id: number): Promise<void>;
  resetAllTurnover(): Promise<void>;
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
    await db.update(sites).set({ currentTurnover: '0' });
  }
}

export const storage = new DatabaseStorage();
