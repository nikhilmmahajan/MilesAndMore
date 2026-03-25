# 06 — Portal Shell & Navigation

## Layout Overview

The authenticated portal uses a fixed three-column layout on desktop:

```
┌─────────────┬───────────────────────────────────┬──────────────┐
│             │                                   │              │
│ LEFT        │  MAIN CONTENT                     │ RIGHT        │
│ SIDEBAR     │  (scrollable)                     │ THE PULSE    │
│ 224px wide  │  (fills remaining width)          │ 320px wide   │
│ fixed       │                                   │ fixed        │
│             │                                   │              │
└─────────────┴───────────────────────────────────┴──────────────┘
                    Gemini Commissioner widget (bottom-right corner, floating)
```

### Responsive behaviour
- **Desktop (lg+):** Full three columns
- **Tablet (md):** Left sidebar + main; Pulse hidden, accessible via bottom tab
- **Mobile (sm):** Main content only; sidebar becomes a drawer icon top-left; Pulse accessed via bottom nav tab

---

## Left Sidebar

Width: 224px (`w-56`). Background: `brand-mid`. Right border: `brand-accent`.

### Structure (top to bottom)

**Brand header**
- "ALMADEN" on line 1, "FIT AF" on line 2 — orange bold text
- No logo image (text-only wordmark)

**Season Selector**
- Dropdown (shadcn Select) showing all seasons
- Active season pre-selected
- Active season shows a green "● LIVE" badge next to the name
- On change, updates SeasonContext (persists to localStorage)
- Separated by a divider below

**Navigation links**
Each nav item: icon + label, 40px tall, full-width, hover: `bg-brand-accent`.
Active state: `bg-brand-orange` text white.

| Route | Icon | Label |
|-------|------|-------|
| `/dashboard` | User silhouette | Dashboard |
| `/leaderboard` | Trophy | Leaderboard |
| `/cotw` | Lightning bolt | COTW |
| `/streaks` | Fire emoji | Streaks |
| `/map` | Map pin | Activity Map |
| `/hall-of-fame` | Star | Hall of Fame |

**Admin link** (only shown if `user.is_admin`)
- Gear icon + "Admin Panel" — gold text, below a divider

**User footer** (bottom of sidebar)
- Avatar photo (28px circle) + truncated display name
- "Sign out" button — small, gray, with log-out icon

---

## Season Selector Component

- Uses shadcn `Select` component
- Trigger height: 32px, small text
- Options list shows season name + live badge for active season
- Selecting a season calls `SeasonContext.setActiveSeason()`
- All data-fetching pages read from `SeasonContext.activeSeason.id`

---

## Portal Layout Wrapper (`app/(portal)/layout.tsx`)

Server component that:
1. Calls `requireUser()` — redirects to `/login` if not authenticated
2. Fetches all seasons from DB
3. Passes seasons to `SeasonProvider`
4. Renders the three-column shell with `LeftSidebar`, `children` (main), `PulseFeed`

The `SeasonProvider` context wraps everything inside the three-column shell.

---

## Right Sidebar — The Pulse

Width: 320px (`w-80`). Background: `brand-mid`. Left border: `brand-accent`.
Hidden on screens smaller than `lg`.

**Header:** "The Pulse" title + animated green dot (realtime indicator) + Story post button (pen icon)

**Kudos quick-send bar:** Always visible below header — see `10_THE_PULSE.md`

**Feed area:** Scrollable, fills remaining height. See `10_THE_PULSE.md` for full spec.

---

## Gemini Commissioner Widget

Floating button, fixed `bottom-6 right-6`, z-index high. See `15_GEMINI_COMMISSIONER.md` for full spec.

---

## Page Title Convention

Each page in the portal renders an `<h2>` at the top of the main content area:

```
{Page Title}          ← text-2xl font-bold text-white
{Season Name}         ← text-sm text-gray-400
```

---

## Active Route Detection

The left sidebar highlights the active route by matching `usePathname()` against the route prefixes. A route is "active" if `pathname.startsWith(route)`.
