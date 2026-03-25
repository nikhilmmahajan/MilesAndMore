export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { buildStravaAuthUrl } from '@/lib/strava/oauth'

export async function GET() {
  return NextResponse.redirect(buildStravaAuthUrl())
}
