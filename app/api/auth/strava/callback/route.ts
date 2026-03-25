export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { exchangeCode } from '@/lib/strava/oauth'
import { query } from '@/lib/db'
import { setSessionCookie } from '@/lib/auth'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (!code || error) {
      return NextResponse.redirect(new URL('/login?error=strava_denied', APP_URL))
    }

    let tokenData: Awaited<ReturnType<typeof exchangeCode>>
    try {
      tokenData = await exchangeCode(code)
    } catch (err) {
      console.error('Strava token exchange failed:', err)
      return NextResponse.redirect(new URL('/login?error=token_exchange', APP_URL))
    }

    const { access_token, refresh_token, expires_at, athlete } = tokenData

    const name = `${athlete.firstname} ${athlete.lastname}`
    const stravaUrl = `https://www.strava.com/athletes/${athlete.id}`
    const gender = athlete.sex === 'M' ? 'M' : 'F'

    const result = await query<{ id: string }>(
      `INSERT INTO users (strava_id, name, photo_url, gender, strava_url, strava_access_token, strava_refresh_token, strava_token_expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, to_timestamp($8))
       ON CONFLICT (strava_id) DO UPDATE SET
         name = EXCLUDED.name,
         photo_url = EXCLUDED.photo_url,
         strava_access_token = EXCLUDED.strava_access_token,
         strava_refresh_token = EXCLUDED.strava_refresh_token,
         strava_token_expires_at = EXCLUDED.strava_token_expires_at
       RETURNING id`,
      [
        String(athlete.id),
        name,
        athlete.profile ?? null,
        gender,
        stravaUrl,
        access_token,
        refresh_token,
        expires_at,
      ]
    )

    const userId = result.rows[0].id
    const headers = new Headers()
    setSessionCookie(userId, headers)

    return NextResponse.redirect(new URL('/dashboard', APP_URL), { headers })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
