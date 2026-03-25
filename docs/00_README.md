# Almaden Fit AF — Developer Specification Index

> These documents are the complete specification for the Almaden Fit AF community fitness portal.
> They are written for your development team to implement from scratch.
> Each file covers one feature area end-to-end: what it does, how it works, what it needs, and what it produces.

---

## What You Are Building

Almaden Fit AF is a gamified community fitness portal for ~100 neighbourhood residents in Almaden, CA. It replaces a manual Google Sheets workflow currently in use. **Season 7 is live and mid-season** — the site must launch with all Season 7 historical data already visible.

### The Core Game Loop
1. Challengers connect via Strava OAuth (only login method)
2. Strava activities auto-sync every 12 hours (1 min = 1 point)
3. Weekly Consistency Streak submissions earn bonus points
4. Weekly Challenges of the Week (COTW) earn bonus points
5. A real-time social feed called **The Pulse** surfaces all community activity
6. Individual and team leaderboards refresh daily/weekly
7. A Gemini AI chatbot called **The Commissioner** answers questions and banters

---

## Document Index

| # | File | What it specifies |
|---|------|--------------------|
| 00 | `00_README.md` | **This file** — project overview, tech stack, conventions |
| 01 | `01_PROJECT_SETUP.md` | Repo structure, all dependencies, environment variables, folder layout |
| 02 | `02_DATABASE_SCHEMA.md` | All 16 tables, indexes, RLS policies, views, seed data |
| 03 | `03_AUTH_AND_SESSIONS.md` | Strava OAuth flow, session cookie, auth helpers, middleware |
| 04 | `04_STRAVA_SYNC.md` | 12-hour sync pipeline, token refresh, activity ingestion, dedup logic |
| 05 | `05_SCORING_ENGINE.md` | Point formula, recalc triggers, score_cache, cron schedule, comeback meter |
| 06 | `06_PORTAL_SHELL.md` | Three-column layout, left sidebar nav, season selector, season context |
| 07 | `07_LEADERBOARDS.md` | Individual leaderboard, team leaderboard, rank delta, gender filter, score breakdown |
| 08 | `08_STREAKS.md` | Track enrollment, weekly submission, bench warmer, streak calendar heatmap |
| 09 | `09_COTW.md` | Challenge viewer, participation form, proof upload, winner display |
| 10 | `10_THE_PULSE.md` | Realtime feed, all 10 event types, emoji reactions, kudos, story posts |
| 11 | `11_ADMIN_PANEL.md` | Season management, team builder, COTW management, bonus points, nudges, activity flagging |
| 12 | `12_PERSONAL_DASHBOARD.md` | Personal analytics, activity charts, streak history, COTW summary |
| 13 | `13_ACTIVITY_MAP.md` | Neighbourhood Mapbox map, GPS dot overlay, privacy handling |
| 14 | `14_GAMIFICATION.md` | Hot streak badge, first-submission badge, milestones, rivalry mode, season passport, season wrapped |
| 15 | `15_GEMINI_COMMISSIONER.md` | AI chatbot, context injection, chat widget, prompt design |
| 16 | `16_HALL_OF_FAME.md` | Season champions gallery, HOF card format, category types |
| 17 | `17_MIGRATION.md` | Python migration script spec, field mappings, error handling, post-import checklist |
| 18 | `18_DEPLOYMENT.md` | Vercel setup, cron schedules, storage buckets, PWA manifest, go-live checklist |

---

## Tech Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| Framework | Next.js 14, App Router | SSR + API routes in one repo |
| Language | TypeScript, strict mode | Type safety on all DB interactions |
| Styling | Tailwind CSS + shadcn/ui | Dark mode, consistent component library |
| Database | Supabase (PostgreSQL 15) | Auth, Realtime, Storage, RLS all built-in |
| Auth | Strava OAuth 2.0 | Single sign-on — no passwords |
| Charts | Recharts | React-native, covers all required viz types |
| Map | Mapbox GL JS via react-map-gl | Best-in-class neighbourhood map |
| AI | Google Gemini 1.5 Flash | Fast, cheap, strong RAG support |
| Cron | Vercel Cron | Native Next.js scheduling |
| Hosting | Vercel | Zero-config Next.js deployment |
| Migration | Python 3.11 | One-time Google Sheets → Supabase import |

---

## Visual Design System

### Colour Palette

| Token | Hex | Use |
|-------|-----|-----|
| `brand-orange` | `#E8500A` | Primary CTAs, score numbers, brand moments |
| `brand-dark` | `#1A1A2E` | Page background |
| `brand-mid` | `#16213E` | Cards, panels, sidebars |
| `brand-accent` | `#0F3460` | Borders, secondary elements |
| `brand-gold` | `#F5A623` | Winners, Hall of Fame, streak badges |

### Design Rules
- **Always dark mode.** Never implement a light mode toggle.
- All scores displayed in `font-mono` typeface
- Rank numbers: top 3 use 🥇🥈🥉 emoji, rest use `#N`
- Rank movement: ▲ green for up, ▼ red for down, — gray for unchanged

---

## Repo Structure Overview

```
almaden-fit-af/
├── app/
│   ├── (auth)/login/               — Strava login page
│   ├── (portal)/                   — All logged-in pages (3-col layout wrapper)
│   │   ├── dashboard/
│   │   ├── leaderboard/
│   │   ├── cotw/
│   │   ├── streaks/
│   │   ├── map/
│   │   ├── hall-of-fame/
│   │   └── profile/[id]/
│   ├── admin/                      — Coach admin panel
│   └── api/                        — API routes (auth, cron, data mutations)
├── components/                     — Shared UI components
├── lib/                            — Business logic, DB clients, helpers
├── supabase/migrations/            — SQL migration files
├── scripts/migrate_almaden.py      — One-time Season 7 data import
├── public/                         — Static assets + PWA manifest
├── middleware.ts                   — Auth guard
└── vercel.json                     — Cron job schedules
```

---

## Environment Variables Required

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY       ← server-only, never expose to browser
STRAVA_CLIENT_ID
STRAVA_CLIENT_SECRET
STRAVA_REDIRECT_URI
GEMINI_API_KEY
NEXT_PUBLIC_MAPBOX_TOKEN
CRON_SECRET                     ← random 32-char string for cron auth
NEXT_PUBLIC_APP_URL
```

---

## Key Decisions (locked — do not re-litigate)

| Decision | Detail |
|----------|--------|
| Auth | Strava OAuth only — no passwords, no Google login |
| Identity key | `users.strava_id` (bigint) — users pre-loaded from migration will auto-link on first OAuth login |
| Session | Cookie named `almaden_user_id` containing user UUID — set by OAuth callback, read by middleware |
| Score reads | Always from `score_cache` table — never compute in components |
| Season scoping | Every data query must filter by `season_id` |
| Realtime | Supabase Realtime on `pulse_posts` table only |
| Mid-season import | All imported rows flagged `source = 'manual_import'` to prevent double-counting |
| Teams | Admin manually assigns — challengers cannot pick or change teams |
| Pulse events | All 10 event types enabled (see `10_THE_PULSE.md`) |
| Streak points | 50 pts/week observed in Season 7 for all levels |
| COTW points | 120 pts/week participation observed in Season 7 |

---

## Season 7 Context

| Item | Value |
|------|-------|
| Teams (6) | Udaan Pari, Sheetal Devi Arrows, Messy Messies, Dhoni Dhurandhars, Holy Kohli, Almaden Bolts |
| Season start | 2026-01-26 |
| Weeks imported | Jan26, Feb02, Feb09, Feb16, Feb23, Mar02, Mar09 |
| Known data issue | Arun Vyas has Team = "Not Found" — assign manually post-import |
| Google Sheet ID | `15MDxg-V6dE72RnE5Od_Q9eSYQZ4-ePDwt7lDku8LisQ` |
