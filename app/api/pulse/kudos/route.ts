export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getOne, query } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { triggerPulseEvent } from '@/lib/pulse/events'
import type { User } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    const sender = await requireUser()
    const {
      recipient_id,
      message,
      season_id,
    }: { recipient_id: string; message: string; season_id: string } =
      await req.json()

    await query(
      `INSERT INTO kudos (sender_id, recipient_id, message, season_id) VALUES ($1, $2, $3, $4)`,
      [sender.id, recipient_id, message, season_id]
    )

    const recipient = await getOne<User>(
      `SELECT * FROM users WHERE id = $1`,
      [recipient_id]
    )

    await triggerPulseEvent({
      userId: sender.id,
      seasonId: season_id,
      eventType: 'kudos_received',
      content: `${sender.name} sent kudos to ${recipient?.name ?? 'someone'}: "${message}"`,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
