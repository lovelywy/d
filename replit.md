# USDT Financial Mission

## Overview
A financial simulation app for USDT/THB arbitrage across multiple gambling websites. Calculates optimal deposit splits, tracks 1x turnover requirements per site, predicts profit ranges, and provides Thai voice alerts for progress.

## Architecture
- **Frontend**: React + Vite + TailwindCSS + shadcn/ui (port 5000)
- **Backend**: Express.js API server
- **Database**: PostgreSQL (Neon-backed via Replit)
- **ORM**: Drizzle

## Key Files
- `shared/schema.ts` - Database models (sites, history)
- `shared/routes.ts` - API contract definitions
- `server/routes.ts` - Express API routes + CoinGecko integration
- `server/storage.ts` - Database CRUD operations
- `client/src/pages/home.tsx` - Main app (Calculator, Tracker, History tabs)
- `client/src/App.tsx` - Router setup

## Features
1. **Calculator Tab**: USDT input → auto THB conversion → +/- row site selection with dropdown (max 5) → calculate deposit per site (THB + USDT columns) → predict profit range
2. **Site Management**: Full CRUD dialog - create new sites, inline edit (name, rate, bonus, balance), delete with confirmation
3. **Site Configs**: Save/load named site configurations to localStorage for quick switching
4. **Site Selection UX**: Starts empty, press "+" to add a row with dropdown picker, "-" to remove rows. Each dropdown filters out already-selected sites.
4. **Turnover Tracker Tab**: Track betting progress per site, Thai voice alerts, remaining balance input after completion, mission confirm with profit announcement, reset button
5. **History Tab**: Logs completed missions with date, profit, site details

## API Endpoints
- `GET /api/rates/usdt-thb` - Fetch from CoinGecko
- `GET /api/sites` - List all sites
- `POST /api/sites` - Create site
- `PUT /api/sites/:id` - Update site
- `DELETE /api/sites/:id` - Delete site
- `POST /api/sites/reset-turnover` - Reset all turnover data
- `GET /api/history` - List history
- `POST /api/history` - Create history entry

## Calculation Logic
- Fee: 1 USDT per site deducted from total
- Equal credit distribution across sites using each site's deposit rate and bonus
- Results show deposited THB (pre-bonus) - this is what user inputs on each site
- Bonus only affects profit prediction formula, not displayed amount
- Profit prediction: min = (totalCredits/2 + totalCredits/2*0.95) - capitalTHB, max = totalCredits - capitalTHB

## Mission Flow
1. Calculate deposit splits in Calculator tab
2. Save targets to Tracker
3. Update bet amounts per site (voice announces remaining)
4. When turnover complete per site, enter remaining balance
5. When all sites complete + all balances entered → Confirm mission
6. Voice announces profit → saves to history → auto-resets

## User Preferences
- Thai language UI and voice alerts
- CoinGecko API for rates (not Binance)
