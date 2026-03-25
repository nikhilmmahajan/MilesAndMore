# 01 — Project Setup

## Purpose
This document defines the complete dependency list, folder structure, environment variables, and configuration requirements your team needs before writing any feature code.

---

## 1. Framework and Language

- **Next.js 14** with App Router (not Pages Router)
- **TypeScript** with `strict: true`
- **Node.js** 20+ required

---

## 2. npm Dependencies

### Core
| Package | Purpose |
|---------|---------|
| `@supabase/supabase-js` | Supabase client |
| `@supabase/ssr` | Supabase SSR cookies helper |
| `@google/generative-ai` | Gemini chatbot |
| `mapbox-gl` + `react-map-gl` | Activity map |
| `recharts` | All charts |
| `date-fns` | Date formatting and manipulation |

### UI
| Package | Purpose |
|---------|---------|
| `tailwindcss-animate` | Animation plugin for shadcn |
| `class-variance-authority` | Variant-based className helper |
| `clsx` + `tailwind-merge` | Safe className merging |
| `lucide-react` | Icon library |

### shadcn/ui components needed
`button`, `card`, `badge`, `dialog`, `dropdown-menu`, `select`, `tabs`, `toast`, `avatar`, `separator`, `skeleton`, `switch`, `input`, `label`, `textarea`, `scroll-area`, `popover`, `command`

### Forms
`react-hook-form`, `zod`, `@hookform/resolvers`

---

## 3. Tailwind Configuration Requirements

- `darkMode: ['class']` — dark mode toggled by class on `<html>`
- Custom colour tokens (add to `theme.extend.colors`):

| Token | Hex |
|-------|-----|
| `brand.orange` | `#E8500A` |
| `brand.dark` | `#1A1A2E` |
| `brand.mid` | `#16213E` |
| `brand.accent` | `#0F3460` |
| `brand.gold` | `#F5A623` |

- CSS variables for shadcn/ui dark mode must be set so cards use `brand-mid`, backgrounds use `brand-dark`, borders use `brand-accent`

---

## 4. Global CSS Requirements

- `<html>` and `<body>` always render with dark background (`#1A1A2E`)
- No light mode classes or media queries
- A global `.admin-input` utility class: dark background input with `brand-accent` border, `brand-orange` focus ring

---

## 5. Environment Variables

All variables below are required. The app should fail to start if any are missing.

| Variable | Scope | Source |
|----------|-------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | Supabase dashboard |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server | Supabase dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only — never expose | Supabase dashboard |
| `STRAVA_CLIENT_ID` | Server only | strava.com/settings/api |
| `STRAVA_CLIENT_SECRET` | Server only | strava.com/settings/api |
| `STRAVA_REDIRECT_URI` | Server only | Must match Strava app settings |
| `GEMINI_API_KEY` | Server only | aistudio.google.com |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Client | account.mapbox.com |
| `CRON_SECRET` | Server only | Random 32-char string |
| `NEXT_PUBLIC_APP_URL` | Client + Server | e.g. `https://almaden.example.com` |

---

## 6. Supabase Project Setup

1. Create a new Supabase project in region `us-west-1` (nearest to Cupertino, CA)
2. Enable **Row Level Security** on all tables (schema in `02_DATABASE_SCHEMA.md`)
3. Enable **Realtime** on the `pulse_posts` table only
4. Create a Storage bucket named `media` with public read access
5. Install Supabase CLI and link to the project

### Supabase client file requirements

Three separate client utilities are needed:

| File | Returns | Used in |
|------|---------|---------|
| `lib/supabase/client.ts` | Browser client (anon key) | Client components |
| `lib/supabase/server.ts` | Server client (anon key + cookie handling) | Server components, API routes |
| `lib/supabase/service.ts` | Service role client (bypasses RLS) | Cron jobs, admin mutations, migration endpoints |

**Critical rule:** The service role key must never appear in any file that could be bundled for the browser.

### TypeScript types
After running migrations, generate types with:
```
supabase gen types typescript --local > lib/supabase/database.types.ts
```
Re-run after every schema change.

---

## 7. Middleware Requirements (`middleware.ts`)

The middleware runs on every request and enforces authentication:

| Path pattern | Rule |
|-------------|------|
| `/login`, `/api/auth/*`, `/_next/*`, `/` | Public — no check |
| `/dashboard`, `/leaderboard/*`, `/cotw`, `/streaks`, `/map`, `/hall-of-fame`, `/profile/*` | Requires valid `almaden_user_id` cookie — redirect to `/login` if missing |
| `/admin/*` | Requires valid cookie AND `users.is_admin = true` — redirect to `/dashboard` if not admin |
| All `/api/cron/*` routes | Must have `Authorization: Bearer {CRON_SECRET}` header — return 401 otherwise |

---

## 8. Auth Helper (`lib/auth.ts`)

Three functions needed:

| Function | Returns | Throws |
|----------|---------|--------|
| `getCurrentUser()` | `User \| null` | Never |
| `requireUser()` | `User` | Error if not logged in |
| `requireAdmin()` | `User` | Error if not logged in or not admin |

These read the `almaden_user_id` cookie and query `public.users`. Used in Server Components and API routes.

---

## 9. Season Context

A React Context called `SeasonContext` wraps the entire portal layout and provides:

| Value | Type | Description |
|-------|------|-------------|
| `activeSeason` | `Season \| null` | Currently selected season |
| `setActiveSeason` | `(s: Season) => void` | Update selected season (persists to localStorage) |
| `seasons` | `Season[]` | All seasons, sorted newest first |

**Default selection logic:** Pre-select the season with `status = 'active'`. If none, select the most recent. On page load, restore last selection from `localStorage`.

The provider is initialised in the portal layout with seasons fetched server-side.

---

## 10. Folder Responsibilities

| Folder | What lives there |
|--------|-----------------|
| `app/(auth)/` | Login page only — no portal chrome |
| `app/(portal)/` | All logged-in pages with the 3-column layout wrapper |
| `app/admin/` | Admin panel pages with their own admin layout |
| `app/api/` | API route handlers for mutations and cron |
| `components/ui/` | shadcn/ui base components, untouched |
| `components/layout/` | Sidebar, season selector, portal chrome |
| `components/leaderboard/` | Leaderboard table rows, score breakdown, comeback meter |
| `components/streaks/` | Streak calendar heatmap, enrollment form |
| `components/pulse/` | Feed, cards, composers |
| `components/charts/` | Recharts wrapper components |
| `components/commissioner/` | Gemini chatbot widget |
| `lib/supabase/` | DB clients + generated types |
| `lib/strava/` | OAuth helpers + sync pipeline |
| `lib/scoring/` | Score engine + comeback meter |
| `lib/pulse/` | `triggerPulseEvent` helper used across the app |
| `lib/gamification/` | Hot streak, milestone, first-submission logic |
| `lib/gemini/` | Commissioner context builder + API call |
| `lib/auth.ts` | Auth helper functions |
| `lib/context/` | SeasonContext provider |
| `supabase/migrations/` | One `.sql` file per migration, numbered |
| `scripts/` | Python migration script |
