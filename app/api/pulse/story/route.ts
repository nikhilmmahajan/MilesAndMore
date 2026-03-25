export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { triggerPulseEvent } from '@/lib/pulse/events'

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    const { content, season_id }: { content: string; season_id: string } =
      await req.json()

    await triggerPulseEvent({
      userId: user.id,
      seasonId: season_id,
      eventType: 'story',
      content,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
