export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getMany } from '@/lib/db'
import { requireUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    await requireUser()

    const { searchParams } = req.nextUrl
    const q = searchParams.get('q') ?? ''
    const seasonId = searchParams.get('season_id') ?? ''

    if (q.length < 2) {
      return NextResponse.json([])
    }

    const rows = await getMany(
      `SELECT u.id, u.name, u.photo_url, t.name as team_name
       FROM users u
       LEFT JOIN team_members tm ON tm.user_id = u.id AND tm.season_id = $2
       LEFT JOIN teams t ON t.id = tm.team_id
       WHERE u.name ILIKE $1
       LIMIT 8`,
      [`%${q}%`, seasonId]
    )

    return NextResponse.json(rows)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
