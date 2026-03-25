export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()
    const { id } = params

    await query(`UPDATE seasons SET status = 'archived' WHERE id != $1`, [id])
    await query(`UPDATE seasons SET status = 'active' WHERE id = $1`, [id])

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
