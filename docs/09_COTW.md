# 09 — Challenge of the Week (COTW)

## Overview

Each week the coach publishes a physical challenge. Challengers submit their participation status and optional score. The coach declares one Male and one Female winner. Winners earn bonus points and are recorded in the Hall of Fame.

---

## Page: `/cotw`

Server component fetching for the current week (Monday of current week):
- The COTW challenge for this week (if published)
- Current user's submission (if any)
- All submissions for this week (anonymised count only — not individual names)
- Declared winners for this week
- Last 8 past challenge titles for the history section

All data passed to a Client Component.

---

## State: No Challenge Published

If no challenge exists for the current week:
- Centered card with ⏳ emoji
- Message: "No challenge posted for this week yet."
- Sub-text: "Check back soon — the coach is cooking something up!"

---

## State: Challenge Active

### Challenge Card

Prominent card with orange border glow.

| Element | Content |
|---------|---------|
| Title | `cotw_challenges.title` — large, orange |
| Description | `cotw_challenges.description` — readable paragraph |
| Participation pts | `{N} pts` — shown top-right in gold |
| Video link | "▶ Watch demo video" if `video_url` present |
| Participation tally | "✅ {N} full form · 🤝 {N} assisted · ❌ {N} skipped" — anonymous counts |

### Winners Banner (if declared)

If `cotw_winners` records exist for this week, show a gold-bordered banner:

"🏆 This Week's Champions"

Two champion cards side by side (Male / Female):
- Avatar photo (32px)
- Name bold
- "Male Champion" / "Female Champion" label

---

## State: Already Submitted

Show a green confirmation card:
- "✅ Entry submitted!"
- Participation level (Full Form 💪 / Assisted 🤝)
- Score text if provided
- Points awarded in gold: "+{N} pts"
- No edit option — submissions are final

---

## Submission Form (shown only if not yet submitted)

### Step 1: Participation selector

Three option cards in a 3-column grid:

| Option | Emoji | Label | Points preview |
|--------|-------|-------|---------------|
| `full_form` | 💪 | Nailed It | `{participation_pts} pts` |
| `assisted` | 🤝 | Assisted | `{participation_pts × 0.5} pts` |
| `did_not_do` | ❌ | Skipped | `0 pts` |

Active card: orange border + `bg-brand-orange/20`.

### Step 2: Score input (if full_form or assisted selected)
- Text input: "Your score (reps, time, distance…)"
- Optional field

### Step 3: Notes (optional)
- Textarea: "Notes — shown in The Pulse if you post"
- 2 rows

### Step 4: Proof upload (optional)
- File input (accept image/*, video/*)
- Label: "📸 Upload proof (optional)"
- Shows filename when file selected
- On submit, uploaded to Supabase Storage at path `cotw-proofs/{user_id}/{timestamp}.{ext}`

### Submit button
- "Submit Entry" — `bg-brand-orange`
- Disabled if no participation level selected or submitting

---

## Past Challenges Section

Below the main card, a collapsible "Past Challenges" list:
- Each row: challenge title + week date
- On click: could expand to show the description (optional feature)
- Show last 8 weeks

---

## API Routes

### `POST /api/cotw/submit`
Request body: `{ cotw_id, participation, score_text?, strava_notes?, proof_url? }`

Steps:
1. `requireUser()`
2. Fetch challenge to get `participation_pts`, `winner_bonus_pts`, `season_id`
3. Calculate `points_awarded`:
   - `full_form` → `participation_pts`
   - `assisted` → `floor(participation_pts × 0.5)`
   - `did_not_do` → 0
4. Upsert into `cotw_submissions` ON CONFLICT (user_id, cotw_id) DO UPDATE
5. Call `recalculateUserScore(userId, seasonId)`
6. If participation ≠ `did_not_do`: call `triggerPulseEvent` with type `cotw_submission`
7. Check first-submission badge: if this is the first submission for this challenge, trigger `first_submission_badge` gamification event
8. Return `{ ok: true, points_awarded }`

### `POST /api/cotw/upload-proof`
Request: multipart/form-data with a `file` field

Steps:
1. `requireUser()`
2. Validate file type (images and video only)
3. Upload to Supabase Storage: `media` bucket, path `cotw-proofs/{userId}/{Date.now()}.{ext}`
4. Return `{ url: publicUrl }`

---

## Voting Feature (optional — admin-enabled per challenge)

When `cotw_challenges.voting_enabled = true` and before `voting_deadline`:

Show a voting panel above the submission form:
- Title: "Vote for next week's challenge"
- Option cards showing each option from `voting_options` array
- Challenger can select one option and click "Vote"
- Vote counts shown after voting (or after deadline)

Voting is separate from submission — challengers can vote AND submit for the current challenge.
