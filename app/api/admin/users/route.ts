export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getMany } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    await requireAdmin()

    const { searchParams } = req.nextUrl
    const seasonId = searchParams.get('season_id')

    const users = await getMany(
      `SELECT u.*, t.id as team_id, t.name as team_name, t.color as team_color
       FROM users u
       LEFT JOIN team_members tm ON tm.user_id = u.id AND tm.season_id = $1
       LEFT JOIN teams t ON t.id = tm.team_id
       ORDER BY u.name ASC`,
      [seasonId ?? null]
    )

    return NextResponse.json({ users })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
