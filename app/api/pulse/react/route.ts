export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getOne } from '@/lib/db'
import { requireUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    await requireUser()
    const { post_id, emoji }: { post_id: string; emoji: string } =
      await req.json()

    const result = await getOne<{ reactions: Record<string, number> }>(
      `UPDATE pulse_posts
       SET reactions = reactions || jsonb_build_object($2, COALESCE((reactions->>$2)::int, 0) + 1)
       WHERE id = $1
       RETURNING reactions`,
      [post_id, emoji]
    )

    return NextResponse.json({ reactions: result?.reactions ?? {} })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
