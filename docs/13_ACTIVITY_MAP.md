# 13 — Neighbourhood Activity Map

## Overview

An anonymous dot map showing where community members are logging activities. Built with Mapbox GL JS via `react-map-gl`. Dots are blurred to ~100m radius for privacy. Builds local identity and pride.

---

## Page: `/map`

Client component (Mapbox requires browser).

---

## Map Configuration

| Setting | Value |
|---------|-------|
| Map style | `mapbox://styles/mapbox/dark-v11` — dark to match portal theme |
| Initial centre | Almaden, San Jose, CA — approximately `[-121.8375, 37.2440]` |
| Initial zoom | 13 (neighbourhood level) |
| Map height | Fill main content area minus header |

---

## Data Source

Query `strava_activities` for the active season where `flagged = false` and activities have GPS coordinates (lat/lng from the Strava API).

**Privacy requirement:** Coordinates must be blurred before display. Apply a random offset of ±0.001 degrees (approximately 100m) to each lat/lng before rendering. This ensures no activity can be precisely located.

**Data needed in DB:** The `strava_activities` table needs two additional nullable columns for the live sync:
- `start_lat` numeric(9,6)
- `start_lng` numeric(9,6)

These are populated during the Strava sync from `activity.start_latlng`.
Manual import rows do not have coordinates — they are excluded from the map.

---

## Dot Rendering

Use Mapbox `GeoJSON` source + `circle` layer.

| Activity type | Dot colour |
|--------------|-----------|
| Run | `#E8500A` (brand orange) |
| Walk | `#27AE60` green |
| Ride | `#2980B9` blue |
| Hike | `#F5A623` gold |
| Swim | `#8E44AD` purple |
| Workout | `#C0392B` red |
| Other | `#888888` gray |

Dot size: 8px radius, opacity 0.7, with a `circle-blur` of 0.6 for soft glow effect.

---

## Map Controls

- Zoom in/out controls (Mapbox default, bottom-right)
- "Reset view" button: returns to initial Almaden centre + zoom
- Activity type filter checkboxes (optional): toggle Run, Walk, Ride, etc.
- Week range slider (optional): filter dots by week

---

## Performance

- Only fetch coordinates for the active season
- Limit to last 90 days of activity (not full season if very long)
- Client-side blurring applied before rendering
- GeoJSON re-generated when filter changes

---

## Privacy Note

- Dots show activity *routes* approximately — not home addresses
- No user names or identities attached to dots
- All dots rendered anonymously
- The ~100m blur ensures no pin-point accuracy
