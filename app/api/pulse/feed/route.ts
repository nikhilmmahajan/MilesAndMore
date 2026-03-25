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

    const posts = await getMany(
      `SELECT pp.*, u.name, u.photo_url
       FROM pulse_posts pp
       JOIN users u ON u.id = pp.user_id
       WHERE pp.season_id = $1
       ORDER BY pp.is_pinned DESC, pp.created_at DESC
       LIMIT 50`,
      [seasonId]
    )

    return NextResponse.json({ posts })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
