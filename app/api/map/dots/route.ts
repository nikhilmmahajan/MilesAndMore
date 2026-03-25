export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { getMany } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    await requireUser()
    const seasonId = request.nextUrl.searchParams.get('season_id')
    if (!seasonId) return NextResponse.json({ dots: [] })

    const rows = await getMany<{
      start_lat: number
      start_lng: number
      activity_type: string
    }>(
      `SELECT start_lat, start_lng, activity_type FROM strava_activities
       WHERE season_id = $1 AND flagged = false AND start_lat IS NOT NULL AND start_lng IS NOT NULL
       AND created_at > now() - interval '90 days'`,
      [seasonId]
    )

    const dots = rows.map(r => ({
      lat: r.start_lat + (Math.random() - 0.5) * 0.001,
      lng: r.start_lng + (Math.random() - 0.5) * 0.001,
      type: r.activity_type,
    }))

    return NextResponse.json({ dots })
  } catch {
    return NextResponse.json({ dots: [] })
  }
}
