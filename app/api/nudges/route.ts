export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getMany, query } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import type { Nudge } from '@/lib/types'

export async function GET() {
  try {
    const user = await requireUser()

    const nudges = await getMany<Nudge>(
      `SELECT * FROM nudges WHERE recipient_id = $1 ORDER BY created_at DESC`,
      [user.id]
    )

    const unreadCount = nudges.filter((n) => !n.is_read).length

    await query(
      `UPDATE nudges SET is_read = true WHERE recipient_id = $1`,
      [user.id]
    )

    return NextResponse.json({ nudges, unread_count: unreadCount })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
