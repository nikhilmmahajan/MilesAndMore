# 16 — Hall of Fame

## Overview

A permanent gallery page showing season champions. The aspirational anchor of the platform — what challengers work toward each season.

---

## Page: `/hall-of-fame`

Server component. Fetches all `hall_of_fame` rows joined with `users`, `teams`, and `seasons`, grouped by season and sorted newest first.

---

## Page Layout

Title: "🏆 Hall of Fame" — large, gold, centred
Subtitle: "The legends of Almaden Fit AF" — gray

Below: one section per season, sorted newest first.

---

## Season Section

**Section header:** Season name (e.g. "Season 7") as `h2`, with a gold bottom border.

**Cards grid:** `grid-cols-2 md:grid-cols-3` of HOF cards.

---

## HOF Card

Compact card (`brand-mid` background, gold border `border-brand-gold/30`).

| Zone | Content |
|------|---------|
| Category label | Small gold text at top (from category map below) |
| Avatar | 48px circle, gold border (if individual award) |
| Name | Bold white — challenger name or team name |
| Value | Gold monospace — score, minutes count, streak weeks, etc. |
| Week (if applicable) | Small gray — "Week of {date}" for weekly awards |

On hover: border brightens to `border-brand-gold/60`.

---

## Category Labels

| Category | Display label |
|----------|--------------|
| `cotw_weekly_champion_m` | 🏆 Male COTW Champion |
| `cotw_weekly_champion_f` | 🏆 Female COTW Champion |
| `season_streak_champion` | 🔥 Streak Champion |
| `season_top_scorer_m` | 🥇 Top Male Scorer |
| `season_top_scorer_f` | 🥇 Top Female Scorer |
| `season_team_champion` | 👥 Team Champions |
| `most_minutes` | ⏱️ Most Minutes |

---

## Populating Hall of Fame

HOF entries are created by admin actions:

| Entry | When created |
|-------|-------------|
| Weekly COTW winners (M/F) | When admin declares winner in admin panel |
| Season end awards | Admin manually creates via admin panel at season end |

**Season end process (admin runs this):**
1. Query `score_cache` for top scorer male + female
2. Query `v_team_leaderboard` for winning team
3. Query `streak_submissions` for most consecutive completed weeks
4. Query `strava_activities` SUM for most minutes
5. Insert all records into `hall_of_fame`

There should be an "Archive Season" button in the admin panel that triggers this process automatically.

---

## Empty State

If no HOF entries exist yet: centred "🌟 No champions yet — season is still in progress!"
