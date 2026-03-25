# 03 — Authentication and Sessions

## Overview

Strava OAuth is the **only** login method. There are no passwords, no email/magic-link, no Google login. The session is managed via a simple signed cookie.

---

## OAuth Flow

```
User visits /login
  → clicks "Connect with Strava"
  → GET /api/auth/strava
  → redirect to Strava authorization URL
      (scope: read, activity:read_all)
  → Strava redirects to STRAVA_REDIRECT_URI with ?code=xxx
  → GET /api/auth/strava/callback
      1. Exchange code for access_token + refresh_token
      2. Fetch athlete profile from Strava
      3. Upsert user in DB by strava_id
      4. Set cookie almaden_user_id = user.id
  → redirect to /dashboard
```

---

## Critical: Pre-loaded Users

The migration script pre-populates `users` with `strava_id` values from the Google Sheet. When a challenger logs in for the first time via Strava OAuth:

- The callback handler upserts by `strava_id` (ON CONFLICT strava_id DO UPDATE)
- Tokens are attached to the **existing** user record — no duplicate is created
- The challenger immediately sees their full Season 7 standing

This is the most important behaviour to get right. Test it thoroughly.

---

## Pages and Routes

### `/login` page
- Full-screen dark page, no portal chrome
- Almaden Fit AF logo/wordmark centred
- Single CTA button: **"Connect with Strava"** in Strava orange (`#FC4C02`)
- Includes Strava's official logo SVG on the button
- Text beneath: "By connecting, you allow Almaden Fit AF to read your Strava activities."
- If user already has a valid cookie, redirect to `/dashboard`

### `GET /api/auth/strava`
- Constructs Strava authorization URL with:
  - `client_id`: from env
  - `redirect_uri`: from env (`STRAVA_REDIRECT_URI`)
  - `response_type`: code
  - `approval_prompt`: auto
  - `scope`: read,activity:read_all
- Returns a 302 redirect to Strava

### `GET /api/auth/strava/callback`
Steps in order:
1. Read `?code` from query string; if missing or `?error` present → redirect to `/login?error=strava_denied`
2. POST to `https://www.strava.com/oauth/token` with code, client_id, client_secret, grant_type=authorization_code
3. On failure → redirect to `/login?error=token_exchange`
4. Extract `access_token`, `refresh_token`, `expires_at`, `athlete` from response
5. Upsert into `users`:
   - Fields set: `strava_id`, `name`, `photo_url`, `gender`, `strava_url`, `strava_access_token`, `strava_refresh_token`, `strava_token_expires_at`
   - Conflict target: `strava_id`
   - Update strategy: DO UPDATE on all token fields + name + photo
6. Set `HttpOnly` cookie named `almaden_user_id` with value = `user.id` (UUID)
   - `Secure: true` in production
   - `SameSite: Lax`
   - Max age: 30 days
7. Redirect to `/dashboard`

### `POST /api/auth/logout`
- Delete the `almaden_user_id` cookie
- Redirect to `/login`

---

## Session Cookie Spec

| Attribute | Value |
|-----------|-------|
| Name | `almaden_user_id` |
| Value | User UUID from `users.id` |
| HttpOnly | true |
| Secure | true in production, false in dev |
| SameSite | Lax |
| Path | `/` |
| Max-Age | 2,592,000 (30 days) |

---

## Token Refresh

Strava access tokens expire every 6 hours. The 12-hour sync cron must check expiry before each user sync:

- If `strava_token_expires_at - 5 minutes < now()`:
  - POST to `https://www.strava.com/oauth/token` with `grant_type=refresh_token`
  - Update `strava_access_token`, `strava_refresh_token`, `strava_token_expires_at` in DB
  - Continue sync with new token
- If refresh fails: log error, skip user for this sync cycle

---

## Middleware Auth Guards

See `01_PROJECT_SETUP.md` section 7 for the full middleware routing table.

Key rules:
- All `/api/cron/*` routes must validate `Authorization: Bearer {CRON_SECRET}`
- Admin routes additionally query `users.is_admin`
- No session refresh is needed — the cookie is long-lived and the DB is source of truth

---

## Auth Helper Functions

Located in `lib/auth.ts`. All three read from the `almaden_user_id` cookie:

### `getCurrentUser()`
- Returns `User | null`
- Reads cookie → queries `users` by id
- Returns `null` if cookie missing or user not found
- Never throws

### `requireUser()`
- Returns `User`
- Calls `getCurrentUser()` — throws if null
- Used in API routes that need authentication

### `requireAdmin()`
- Returns `User` where `is_admin = true`
- Calls `requireUser()` — additionally throws if `is_admin = false`
- Used in all `/api/admin/*` routes

---

## Setting `is_admin` for the Coach

After the migration script runs, the coach must be manually set as admin:

1. Find the coach's `id` in the `users` table (search by name or email)
2. Run: `UPDATE users SET is_admin = true WHERE id = '<coach_uuid>';`
3. Alternatively, set via Supabase dashboard Table Editor
