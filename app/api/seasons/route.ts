export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getMany } from '@/lib/db'
import type { Season } from '@/lib/types'

export async function GET() {
  try {
    const seasons = await getMany<Season>(
      `SELECT * FROM seasons ORDER BY start_date DESC`
    )
    return NextResponse.json({ seasons })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
