# 10 — The Pulse (Social Feed)

## Overview

The Pulse is a real-time vertical scrolling social feed permanently visible in the right sidebar of the portal. It surfaces all meaningful community events automatically (streaks, COTW completions, milestones) plus manual posts from challengers and the coach. Updates instantly via Supabase Realtime without page refresh.

---

## Feed Header

Always visible at the top of the right sidebar:
- Animated green dot (●) + "The Pulse" title
- Real-time indicator confirms live connection
- Pen icon button (top-right) opens the Story Composer modal

---

## Kudos Quick-Send Bar

A compact input area immediately below the header, always visible:
- Placeholder text: "👏 Send kudos to a teammate…"
- Tapping it expands to the full Kudos Composer

---

## Feed Content Area

Scrollable. Ordered: pinned posts first, then reverse-chronological.

### Initial load
On mount, fetch the 50 most recent `pulse_posts` for the active season, ordered by `is_pinned DESC, created_at DESC`.

### Realtime updates
Subscribe to Supabase Realtime `postgres_changes` INSERT on `pulse_posts` filtered by `season_id = activeSeason.id`. New posts prepend to the list (maintaining pinned sort).

### Loading state
Show 5 skeleton card placeholders while initial data loads.

### Empty state
If no posts: centered "🏁 Nothing yet — be the first to post!"

---

## Pulse Card

Each feed item is a compact card (`brand-dark` background, `brand-accent` border, rounded-xl, ~80-120px tall).

### Card layout

**Top-left:** Event emoji (large, from event type map below)
**Name + badge:** Author name + event type badge pill (small, rounded-full)
**Content:** Body text in small gray
**Media:** If `media_url` present, show full-width rounded image below text (max 160px height)
**Reactions:** Row of emoji buttons at the bottom
**Timestamp:** Right-aligned, small gray, "Xm ago" / "2h ago" / "3d ago"

### Pinned Coach's Corner posts
- Orange border instead of default
- "📌 Pinned — Coach's Corner" label at the top in orange tiny text
- Displayed at the very top of the feed regardless of timestamp

---

## Event Type Metadata

| Event type | Emoji | Label colour | Auto-generated example text |
|-----------|-------|-------------|----------------------------|
| `cotw_winner` | 🏆 | Gold | "Coach crowned {Name} as this week's Female COTW Champion!" |
| `coaches_corner` | 📣 | Blue | [Coach's manual post text] |
| `hot_streak` | 🔥 | Orange | "{Name} just hit 7 consecutive activity days. Absolute fire!" |
| `streak_complete` | ✅ | Green | "{Name} confirmed their streak — another week done! 💪" |
| `cotw_submission` | 💪 | Purple | "{Name} completed this week's COTW — {score}!" |
| `milestone` | 🎯 | Cyan | "{Name} just crossed {N} total season minutes!" |
| `kudos_received` | 👏 | Pink | "{Sender} sent kudos to {Recipient}: '{message}'" |
| `story` | 📝 | Gray | [Challenger's post text] |
| `announcement` | 📢 | Orange | [Admin broadcast text] |
| `rivalry_started` | ⚔️ | Red | "{Challenger} has challenged {Opponent} to a head-to-head rivalry!" |

---

## Emoji Reactions

Five reaction emojis: 🔥 💪 👏 ❤️ 🎉

**Behaviour:**
- Each emoji shows its count if > 0
- Tapping an emoji: optimistic increment + UPDATE `pulse_posts.reactions` jsonb
- If already reacted (stored in localStorage per post id): tapping again decrements
- Layout: small pill buttons, `border-brand-accent` when count > 0

---

## `triggerPulseEvent` Helper

A server-side function in `lib/pulse/events.ts` called by all API routes that generate feed events.

**Input parameters:**

| Field | Type | Required |
|-------|------|---------|
| `userId` | uuid | Yes — post author |
| `seasonId` | uuid | Yes |
| `eventType` | string | Yes |
| `content` | string | Yes — the display text |
| `mediaUrl` | string | No |
| `isPinned` | boolean | No, default false |
| `metadata` | object | No — extra data for future use |

**Action:** INSERT one row into `pulse_posts` using service role client.

---

## Kudos Composer

Shown in the right sidebar when the quick-send bar is tapped.

**Fields:**
1. Recipient search — type-ahead search (`GET /api/users/search?q={query}&season_id={id}`) showing name + team
2. Message textarea — "Write your kudos message…"
3. Send button + Cancel

**On send:**
1. POST to `/api/pulse/kudos` with `{ recipient_id, message, season_id }`
2. API inserts into `kudos` table
3. API calls `triggerPulseEvent` with type `kudos_received`
4. Close composer, show brief toast "Kudos sent! 👏"

---

## Story Composer

Full-screen modal triggered by the pen icon in the feed header.

**Fields:**
- Textarea: "How did your workout go? Share with the community…" — 5 rows
- Post button + Cancel

**On post:**
1. POST to `/api/pulse/story` with `{ content, season_id }`
2. API calls `triggerPulseEvent` with type `story`
3. Close modal

---

## User Search API (`GET /api/users/search`)

Query params: `q` (min 2 chars), `season_id`

Queries `v_leaderboard` with `ILIKE '%{q}%'` on `name`. Returns up to 8 results:
```json
[{ "id": "uuid", "name": "...", "photo_url": "...", "team_name": "..." }]
```

---

## Season Filtering

The Pulse feed always shows posts for `activeSeason`. When the user switches seasons via the Season Selector, the feed refetches and resubscribes for the new season.
