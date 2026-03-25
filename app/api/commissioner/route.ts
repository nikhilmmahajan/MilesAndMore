export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { askCommissioner, type CommissionerMessage } from '@/lib/gemini/commissioner'

export async function POST(req: NextRequest) {
  try {
    await requireUser()
    const body: { messages: CommissionerMessage[]; season_id: string } = await req.json()
    const { messages, season_id } = body

    const reply = await askCommissioner(messages, season_id)

    return NextResponse.json({ reply })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
