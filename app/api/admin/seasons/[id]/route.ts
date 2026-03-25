export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()
    const { id } = params
    const { track_config } = await req.json()

    await query(
      `UPDATE seasons SET track_config = $1 WHERE id = $2`,
      [JSON.stringify(track_config), id]
    )

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
