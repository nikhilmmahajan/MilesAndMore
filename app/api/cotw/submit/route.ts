export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getOne, query } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { recalculateUserScore } from '@/lib/scoring/engine'
import { triggerPulseEvent } from '@/lib/pulse/events'
import type { CotwChallenge } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    const {
      cotw_id,
      participation,
      score_text,
      strava_notes,
      proof_url,
    }: {
      cotw_id: string
      participation: 'full_form' | 'assisted' | 'did_not_do'
      score_text?: string
      strava_notes?: string
      proof_url?: string
    } = await req.json()

    const challenge = await getOne<CotwChallenge>(
      `SELECT * FROM cotw_challenges WHERE id = $1`,
      [cotw_id]
    )
    if (!challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
    }

    let pointsAwarded: number
    if (participation === 'full_form') {
      pointsAwarded = challenge.participation_pts
    } else if (participation === 'assisted') {
      pointsAwarded = Math.floor(challenge.participation_pts * 0.5)
    } else {
      pointsAwarded = 0
    }

    await query(
      `INSERT INTO cotw_submissions
         (user_id, cotw_id, participation, score_text, strava_notes, proof_url, points_awarded)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id, cotw_id) DO UPDATE SET
         participation = EXCLUDED.participation,
         score_text = EXCLUDED.score_text,
         strava_notes = EXCLUDED.strava_notes,
         proof_url = EXCLUDED.proof_url,
         points_awarded = EXCLUDED.points_awarded`,
      [
        user.id,
        cotw_id,
        participation,
        score_text ?? null,
        strava_notes ?? null,
        proof_url ?? null,
        pointsAwarded,
      ]
    )

    await recalculateUserScore(user.id, challenge.season_id)

    if (participation !== 'did_not_do') {
      await triggerPulseEvent({
        userId: user.id,
        seasonId: challenge.season_id,
        eventType: 'cotw_submission',
        content: `${user.name} completed this week's COTW! 💪`,
      })

      if (participation === 'full_form') {
        const firstFullForm = await getOne<{ count: string }>(
          `SELECT COUNT(*) as count FROM cotw_submissions
           WHERE cotw_id = $1 AND participation = 'full_form'`,
          [cotw_id]
        )
        if (firstFullForm && parseInt(firstFullForm.count) === 1) {
          await triggerPulseEvent({
            userId: user.id,
            seasonId: challenge.season_id,
            eventType: 'cotw_submission',
            content: `${user.name} was first to nail this week's COTW! ⚡ Early mover!`,
            metadata: { first_submission: true },
          })
        }
      }
    }

    return NextResponse.json({ ok: true, points_awarded: pointsAwarded })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
