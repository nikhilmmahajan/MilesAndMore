export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin()
    const {
      recipient_id,
      message,
    }: { recipient_id: string; message: string } = await req.json()

    await query(
      `INSERT INTO nudges (sender_id, recipient_id, message) VALUES ($1, $2, $3)`,
      [admin.id, recipient_id, message]
    )

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
