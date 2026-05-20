# BasketSplit

IE's smartest grocery optimizer. Find the cheapest combination of 
local stores for your full shopping list.

## What It Does
- Basket optimization across 7 Inland Empire grocery stores
- Barcode scanner with real-time price capture
- Community-sourced price database
- Installable PWA — works on any phone

## Tech Stack
- React + Vite
- Deployed on Vercel
- Data: Google Sheets (Phase 2.0), Supabase (Phase 2.2)
- Barcode: @zxing/browser + Open Food Facts API

## Local Development
```bash
# Requires Node on a Pi or local machine
cd dads-app
npm install
npm run dev -- --host
```

## Deployment
Push to main → Vercel auto-deploys. That's it.

## Phase Roadmap
- ✅ Phase 1 — Basket optimizer, PWA
- ✅ Phase 2.0 — Barcode scanner, live data pipeline
- 🔄 Phase 2.1 — Photo verification, GPS store detection
- ⬜ Phase 2.2 — Supabase, user accounts
- ⬜ Phase 3.0 — Community layer, geofencing
- ⬜ Phase 3.1 — Market Raiders game layer

## Origin
Built in one day on a Chromebook through a Raspberry Pi.
Concept born from a conversation with my Dad about grocery bills.