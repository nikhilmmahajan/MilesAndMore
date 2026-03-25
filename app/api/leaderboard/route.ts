export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getMany } from '@/lib/db'
import { requireUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    await requireUser()

    const { searchParams } = req.nextUrl
    const seasonId = searchParams.get('season_id')
    if (!seasonId) {
      return NextResponse.json({ error: 'season_id required' }, { status: 400 })
    }

    const rows = await getMany(
      `SELECT * FROM v_leaderboard WHERE season_id = $1 ORDER BY rank ASC`,
      [seasonId]
    )

    return NextResponse.json({ rows })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
