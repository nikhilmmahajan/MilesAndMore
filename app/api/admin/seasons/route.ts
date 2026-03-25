export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getOne } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import type { Season } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    await requireAdmin()
    const {
      name,
      start_date,
      end_date,
    }: { name: string; start_date: string; end_date: string } = await req.json()

    const season = await getOne<Season>(
      `INSERT INTO seasons (name, start_date, end_date, status)
       VALUES ($1, $2, $3, 'upcoming')
       RETURNING *`,
      [name, start_date, end_date]
    )

    return NextResponse.json({ ok: true, season })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
