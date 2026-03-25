// Strava OAuth helpers — uses placeholder credentials from .env until real keys are configured

export function buildStravaAuthUrl(): string {
  const clientId = process.env.STRAVA_CLIENT_ID ?? 'placeholder'
  const redirectUri = process.env.STRAVA_REDIRECT_URI ?? 'http://localhost:3000/api/auth/strava/callback'
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'read,activity:read_all',
  })
  return `https://www.strava.com/oauth/authorize?${params.toString()}`
}

export async function exchangeCode(code: string): Promise<StravaTokenResponse> {
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    }),
  })
  if (!res.ok) throw new Error('Strava token exchange failed')
  return res.json()
}

export async function refreshToken(refreshToken: string): Promise<StravaTokenResponse> {
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) throw new Error('Strava token refresh failed')
  return res.json()
}

export interface StravaTokenResponse {
  access_token: string
  refresh_token: string
  expires_at: number
  athlete: StravaAthlete
}

export interface StravaAthlete {
  id: number
  firstname: string
  lastname: string
  profile: string
  sex: string
}
