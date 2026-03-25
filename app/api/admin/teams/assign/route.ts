export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin()
    const {
      user_id,
      team_id,
      season_id,
    }: { user_id: string; team_id: string; season_id: string } =
      await req.json()

    await query(
      `INSERT INTO team_members (user_id, team_id, season_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, season_id) DO UPDATE SET team_id = EXCLUDED.team_id`,
      [user_id, team_id, season_id]
    )

    await query(
      `INSERT INTO admin_audit_log (admin_id, action, target_user_id, metadata)
       VALUES ($1, 'team_assign', $2, $3)`,
      [admin.id, user_id, JSON.stringify({ team_id, season_id })]
    )

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
