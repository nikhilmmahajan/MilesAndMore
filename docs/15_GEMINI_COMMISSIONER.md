# 15 — Gemini Commissioner Chatbot

## Overview

A Gemini 1.5 Flash-powered chatbot embedded as a floating widget in the portal. It acts as the "League Commissioner" — knowledgeable, playful, and slightly trash-talking. It has access to live season data through prompt injection (RAG).

---

## Widget: CommissionerWidget

A floating button fixed at `bottom-6 right-6` with a high z-index. Always visible in the portal.

**Collapsed state:** Round button (`w-14 h-14`), `bg-brand-orange`, medal icon (🏅) or chat icon. Hover: slight scale up.

**Expanded state:** A chat panel appears above the button:
- Width: 320px
- Height: 460px
- Rounded-2xl card with `brand-mid` background and `brand-accent` border
- Shadow: `shadow-2xl`

### Chat panel structure

**Header:**
- 🏅 icon + "Commissioner" title + "● Online" in green (10px)
- X button to close

**Messages area:**
- Scrollable
- User messages: right-aligned, `bg-brand-orange` rounded bubble
- Commissioner messages: left-aligned, `brand-dark` bg with `brand-accent` border, rounded bubble
- Typing indicator: three dots animation while awaiting response

**Input area:**
- Text input: "Ask the Commissioner…"
- Send button (brand-orange, paper-plane icon)
- Keyboard shortcut: Enter to send

**Opening message (pre-loaded, not from API):**
> "Commissioner here! 🏅 Ask me anything about the season, standings, or rules!"

---

## API Route: `POST /api/commissioner`

Request body: `{ message: string }`

Steps:
1. `requireUser()`
2. Validate message is not empty
3. Fetch active season ID
4. Build RAG context (see below)
5. Call Gemini 1.5 Flash API
6. Return `{ reply: string }`

---

## RAG Context Injection

Before each API call, fetch fresh live data and inject into the system prompt:

| Data | Query |
|------|-------|
| Top 10 leaderboard | `v_leaderboard` for active season, limit 10 |
| Current user's score | `score_cache` for this user |
| Current week's COTW | Latest `cotw_challenges` for active season |
| Season name + dates | `seasons` where `status = 'active'` |
| Scoring rules | Constructed from `track_config` + known COTW/streak point values |

Format the context as a structured text block prepended to the system prompt.

---

## System Prompt Design

```
You are the Almaden Fit AF League Commissioner — energetic, motivating, 
and slightly trash-talking. You're the official voice of the league.

Rules:
- Keep responses under 150 words
- Use emojis occasionally for personality
- Be encouraging and community-focused
- Answer questions about the current season only
- If asked about other topics, redirect to fitness

CURRENT SEASON: {season_name} ({start_date} → {end_date})

TOP 10 LEADERBOARD:
{#rank Name (Team) — N pts}
...

THIS USER: {name} — {total} pts, rank #{rank}

THIS WEEK'S COTW: {title}
Participation: {participation_pts} pts

SCORING RULES:
- 1 point per Strava activity minute
- Streak completion: 50 pts/week
- COTW participation: {participation_pts} pts
- Admin bonuses awarded weekly
```

---

## Example Queries and Expected Behaviour

| User query | Expected Commissioner behaviour |
|-----------|-------------------------------|
| "Who's in first place?" | Names the leader, their score, trash-talks the gap |
| "How many points do I need to reach top 5?" | Calculates from the leaderboard data injected |
| "I haven't worked out in 4 days" | Motivational response + reminds about streak deadline |
| "What's this week's challenge?" | Describes the COTW from context |
| "How do streaks work?" | Explains from the scoring rules in context |
| "Who's on a hot streak?" | Identifies challengers with recent activity momentum |

---

## Error Handling

If Gemini API call fails: return `{ reply: "Commissioner is having technical difficulties. Try again! 🤖" }`

If no active season: return `{ reply: "No active season right now, Commissioner is off duty! 😴" }`
