# 07 — Leaderboards

Two leaderboards: Individual (daily refresh) and Team (Monday refresh). Both read exclusively from pre-calculated cache tables.

---

## Leaderboard Page Layout

`/leaderboard` renders inside the portal shell. A tab row at the top switches between Individual and Teams views:

```
[ Individual ]  [ Teams ]
```

Active tab: `bg-brand-orange`, rounded-full pill style.

---

## Individual Leaderboard

### Data source
`v_leaderboard` view filtered by `season_id = activeSeason.id`, ordered by `rank ASC`.

### Page header
- Title: "Individual Leaderboard"
- Season name in gray below
- Gender filter pills on the right: **All / Male / Female**
  - Default: All
  - Filtering is client-side, no refetch needed
  - Active pill: `bg-brand-orange`

### Table rows

Each row is a clickable card (`brand-mid` background, `brand-accent` border).
Clicking a row expands/collapses the ScoreBreakdown panel below it.
The current user's row is highlighted with `border-brand-orange` and `bg-brand-orange/10`.

**Row layout (left to right):**

| Zone | Content |
|------|---------|
| Rank | 🥇🥈🥉 for top 3; `#N` in monospace gray for rest |
| Delta | ▲ green / ▼ red / — gray; number of positions moved |
| Avatar | 32px circle photo from Strava (or initials placeholder) |
| Name + Team | Name bold white; team name in small gray below |
| Comeback meter | Only shown for logged-in user if gap > 20 pts — see `05_SCORING_ENGINE.md` |
| Total score | Monospace bold orange, large. "pts" in small gray below |

### Score breakdown panel (expanded)
See `05_SCORING_ENGINE.md` — ScoreBreakdown component spec.
Shown inline below the row when tapped. Slide-down animation.

### Empty state
If no data: centered message with a 🏁 emoji — "Season hasn't started yet."

### Refresh indicator
Small gray text at the bottom: "Last updated: {time ago}" from `score_cache.last_calculated`.

---

## Team Leaderboard

### Data source
`v_team_leaderboard` view filtered by `season_id = activeSeason.id`, ordered by `rank ASC`.

### Team cards

Each team is a horizontal card with a 4px left border in the team's colour:

| Zone | Content |
|------|---------|
| Rank | 🥇🥈🥉 or `#N` |
| Team name | Bold white |
| Member count | Small gray "{N} members" |
| Weekly delta | `+N pts this week` in green, or `−N` in red |
| Total score | Monospace bold orange, large |

### Team Trends Chart

Below the cards, a line chart showing cumulative weekly scores per team:
- X-axis: week labels (Jan 26, Feb 2, etc.)
- Y-axis: cumulative points
- One line per team, coloured by `teams.color`
- Chart library: Recharts `LineChart`
- Height: 300px
- Title: "Team Trends"
- Note below: "Weekly cumulative team scores. Updates every Monday."

---

## Leaderboard Data Fetching

Both leaderboard pages are **Server Components** that:
1. Read `activeSeason` (passed from portal layout)
2. Query the relevant view server-side
3. Pass data to Client Components for interactivity (expand/collapse, filter)

No client-side polling — data is static until page refresh or cron runs.

---

## Gender Filter Behaviour

- Works client-side on the already-fetched data
- `All`: show everyone
- `Male`: only show rows where `gender = 'M'`
- `Female`: only show rows where `gender = 'F'`
- Ranks shown are the **overall** ranks, not gender-specific ranks

---

## Performance Note

The `v_leaderboard` view has a `(season_id, total DESC)` index on `score_cache`. Full leaderboard for 100 users loads in a single query.
