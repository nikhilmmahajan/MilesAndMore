# 18 — Deployment

## Hosting: Vercel

Vercel is the hosting platform. Zero-config Next.js deployment.

---

## Vercel Setup

1. Connect your GitHub repo to Vercel
2. Framework preset: Next.js (auto-detected)
3. Set all environment variables in Vercel → Project → Settings → Environment Variables

### Production vs Preview environment variables

| Variable | Production | Preview (dev branches) |
|----------|-----------|----------------------|
| `STRAVA_REDIRECT_URI` | `https://yourdomain.vercel.app/api/auth/strava/callback` | `https://preview-url.vercel.app/api/auth/strava/callback` |
| `NEXT_PUBLIC_APP_URL` | `https://yourdomain.vercel.app` | Preview URL |
| All others | Same value | Same value |

### Custom domain (optional)
Set your domain in Vercel → Project → Domains. Update `STRAVA_REDIRECT_URI` and Strava app settings accordingly.

---

## Cron Jobs (`vercel.json`)

Create `vercel.json` at repo root:

```json
{
  "crons": [
    {
      "path": "/api/cron/strava-sync",
      "schedule": "0 */12 * * *"
    },
    {
      "path": "/api/cron/leaderboard",
      "schedule": "0 8 * * *"
    },
    {
      "path": "/api/cron/leaderboard-teams",
      "schedule": "0 14 * * 1"
    }
  ]
}
```

**Schedule explanations (UTC):**

| Job | UTC schedule | Converts to |
|-----|-------------|-------------|
| Strava sync | `0 */12 * * *` | Every 12 hours |
| Individual leaderboard | `0 8 * * *` | Midnight PST (UTC-8) |
| Team leaderboard | `0 14 * * 1` | Monday 6 AM PST |

All cron routes require `Authorization: Bearer {CRON_SECRET}` header. Vercel sends this automatically when the job is configured with the header.

---

## Supabase Configuration

### Storage Buckets

Create via Supabase dashboard → Storage:

| Bucket | Access | Purpose |
|--------|--------|---------|
| `media` | Public read | COTW proof uploads, profile photos, Coach's Corner media |

Storage path structure:
- COTW proofs: `media/cotw-proofs/{user_id}/{timestamp}.{ext}`
- Profile photos: `media/profile/{user_id}.jpg` (future use)

### Realtime

Enable Realtime for `pulse_posts` table only:
- In Supabase dashboard → Database → Replication
- Add `public.pulse_posts` to the realtime publication

### Connection pooling

For production, use Supabase's connection pooler (port 6543) rather than direct connection for API routes. The Supabase JS client handles this automatically.

---

## PWA Manifest (`public/manifest.json`)

```json
{
  "name": "Almaden Fit AF",
  "short_name": "FitAF",
  "description": "Community Fitness Portal",
  "start_url": "/dashboard",
  "display": "standalone",
  "background_color": "#1A1A2E",
  "theme_color": "#E8500A",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

Add `<link rel="manifest" href="/manifest.json" />` to the root layout `<head>`.

---

## Strava App Settings (Production)

In Strava developer settings:
- **Authorization Callback Domain:** `yourdomain.vercel.app`
- Update this before users try to log in on production

---

## Go-Live Checklist

### Infrastructure
- [ ] All env vars set in Vercel (10 variables)
- [ ] Supabase project created in `us-west-1`
- [ ] All SQL migrations applied (`supabase db push` or manual)
- [ ] Supabase types regenerated (`supabase gen types typescript --local`)
- [ ] Storage bucket `media` created as public
- [ ] Realtime enabled on `pulse_posts`
- [ ] `vercel.json` crons deployed

### Data
- [ ] Season 7 row manually created in Supabase
- [ ] Season 7 UUID added to `.env` / Vercel env as `SEASON_7_ID`
- [ ] Season 7 teams seeded (6 teams with correct colours)
- [ ] Migration script dry-run completed with no critical errors
- [ ] Migration script live run completed
- [ ] `migration_errors.csv` reviewed and all issues resolved
- [ ] Arun Vyas assigned to correct team

### Post-Migration
- [ ] `is_admin = true` set for coach's user record
- [ ] COTW challenge titles/descriptions updated in admin panel
- [ ] Team captains set in team builder
- [ ] Top 5 leaderboard verified against Google Sheet

### Testing
- [ ] Strava OAuth login works for one test user
- [ ] Test user sees their correct Season 7 standing on login
- [ ] COTW submission works and appears in The Pulse
- [ ] Streak submission works
- [ ] Admin panel accessible to coach only
- [ ] First Strava sync cron runs and doesn't double-count
- [ ] Gemini Commissioner responds correctly
- [ ] The Pulse realtime updates work (open two browser windows)

### Launch
- [ ] Share portal URL with all challengers
- [ ] Announce in community WhatsApp/group chat
- [ ] Coach posts first Coach's Corner in admin panel
