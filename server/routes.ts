
import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import https from "https";
import fs from "fs";
import path from "path";

// Helper to fetch external API using native Node https
function fetchCoinGeckoPrice(): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = "https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=thb";
    const options = {
      headers: {
        'User-Agent': 'USDT-Mission-App/1.0',
        'Accept': 'application/json'
      }
    };
    https.get(url, options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          if (json.tether && json.tether.thb) {
            resolve(json.tether.thb.toString());
          } else {
            console.log("CoinGecko raw response:", data);
            reject(new Error("Invalid response from CoinGecko"));
          }
        } catch (e) {
          reject(e);
        }
      });
    }).on("error", (e) => reject(e));
  });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // === RATES ===
  app.get(api.rates.get.path, async (_req, res) => {
    try {
      const price = await fetchCoinGeckoPrice();
      res.json({ price });
    } catch (error) {
      console.error("CoinGecko API error:", error);
      res.status(500).json({ message: "Failed to fetch rate from CoinGecko" });
    }
  });

  // === SITES ===
  app.get(api.sites.list.path, async (_req, res) => {
    const sites = await storage.getSites();
    res.json(sites);
  });

  app.post(api.sites.create.path, async (req, res) => {
    try {
      const input = api.sites.create.input.parse(req.body);
      const site = await storage.createSite(input);
      res.status(201).json(site);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.put(api.sites.update.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const input = api.sites.update.input.parse(req.body);
      const site = await storage.updateSite(id, input);
      res.json(site);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(404).json({ message: "Site not found" });
    }
  });

  app.delete(api.sites.delete.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      await storage.deleteSite(id);
      res.status(204).send();
    } catch (err) {
      res.status(404).json({ message: "Site not found" });
    }
  });

  app.post(api.sites.resetTurnover.path, async (_req, res) => {
    await storage.resetAllTurnover();
    res.json({ message: "All turnovers reset" });
  });

  // === HISTORY ===
  app.get(api.history.list.path, async (_req, res) => {
    const history = await storage.getHistory();
    res.json(history);
  });

  app.post(api.history.create.path, async (req, res) => {
    try {
      const input = api.history.create.input.parse(req.body);
      const entry = await storage.createHistory(input);

      const logDir = path.join(process.cwd(), "mission_logs");
      if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

      const details = input.details as any;
      const now = new Date();
      const dateStr = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const logFile = path.join(logDir, `mission_${dateStr}.log`);

      let logContent = `=== USDT Mission Log ===\n`;
      logContent += `Date: ${now.toLocaleString("th-TH")}\n`;
      logContent += `Capital: ${parseFloat(input.initialThb).toLocaleString()} THB (${input.totalUsdt} USDT)\n`;
      logContent += `Exchange Rate: ${details.exchangeRate} THB/USDT\n`;
      logContent += `Profit: ${parseFloat(input.profit).toLocaleString()} THB\n`;
      logContent += `\n--- Per-Site Details ---\n`;
      if (details.sites) {
        for (const s of details.sites) {
          logContent += `${s.name}: Remaining = ${parseFloat(s.balance || "0").toLocaleString()} THB, Target Turnover = ${parseFloat(s.target || "0").toLocaleString()} THB\n`;
        }
      }
      logContent += `========================\n`;

      fs.writeFileSync(logFile, logContent, "utf-8");
      console.log(`Mission log saved: ${logFile}`);

      res.status(201).json(entry);
    } catch (err) {
      res.status(400).json({ message: "Invalid history data" });
    }
  });

  app.put(api.history.update.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const input = api.history.update.input.parse(req.body);
      const entry = await storage.updateHistory(id, input);
      res.json(entry);
    } catch (err) {
      res.status(404).json({ message: "History entry not found" });
    }
  });

  app.delete(api.history.delete.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      await storage.deleteHistory(id);
      res.status(204).send();
    } catch (err) {
      res.status(404).json({ message: "History entry not found" });
    }
  });

  // === SEED DATA ===
  const existingSites = await storage.getSites();
  if (existingSites.length === 0) {
    await storage.createSite({
      name: "Site A",
      depositRate: "34.5",
      bonusPercent: "10",
      targetTurnover: "5000",
      currentTurnover: "0",
      isActive: true
    });
    await storage.createSite({
      name: "Site B",
      depositRate: "35.0",
      bonusPercent: "5",
      targetTurnover: "3000",
      currentTurnover: "0",
      isActive: true
    });
  }

  return httpServer;
}
