export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth'
import { getOne, getMany } from '@/lib/db'
import type { Season, CotwChallenge } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Zap, Crown } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { CotwCreateForm } from './CotwCreateForm'
import { WinnerDeclaration } from './WinnerDeclaration'

interface Submitter {
  user_id: string
  name: string
  photo_url: string | null
  gender: 'M' | 'F' | null
  score_text: string | null
  is_winner: boolean
}

interface ChallengeWithSubmitters extends CotwChallenge {
  submitters: Submitter[]
}

export default async function CotwPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/dashboard')
  }

  const season = await getOne<Season>(
    "SELECT * FROM seasons WHERE status = 'active' LIMIT 1",
    []
  )

  if (!season) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-white">Challenge of the Week</h1>
        <p className="text-gray-400">No active season found.</p>
      </div>
    )
  }

  const challenges = await getMany<CotwChallenge>(
    'SELECT * FROM cotw_challenges WHERE season_id = $1 ORDER BY week_start_date DESC',
    [season.id]
  )

  const challengesWithSubmitters: ChallengeWithSubmitters[] = await Promise.all(
    challenges.map(async (c) => {
      const submitters = await getMany<Submitter>(
        `SELECT cs.user_id, u.name, u.photo_url, u.gender, cs.score_text,
                EXISTS(SELECT 1 FROM cotw_winners cw WHERE cw.cotw_id = cs.cotw_id AND cw.user_id = cs.user_id) as is_winner
         FROM cotw_submissions cs
         JOIN users u ON u.id = cs.user_id
         WHERE cs.cotw_id = $1 AND cs.participation = 'full_form'
         ORDER BY u.gender, u.name`,
        [c.id]
      )
      return { ...c, submitters }
    })
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Challenge of the Week</h1>
        <p className="text-gray-400 text-sm mt-1">
          Active season: <span className="text-brand-gold">{season.name}</span>
        </p>
      </div>

      <CotwCreateForm seasonId={season.id} />

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Zap size={18} className="text-brand-orange" />
          Existing Challenges ({challenges.length})
        </h2>

        {challengesWithSubmitters.map((c) => (
          <Card key={c.id} className="bg-brand-mid border-brand-accent">
            <CardHeader>
              <CardTitle className="text-white text-base flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>{c.title}</span>
                  <Badge className="bg-brand-accent text-gray-300 text-xs">
                    Week of {formatDate(c.week_start_date, 'MMM d')}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-sm font-normal">
                  <span className="text-brand-orange">{c.participation_pts} pts</span>
                  <span className="text-brand-gold">+{c.winner_bonus_pts} winner bonus</span>
                </div>
              </CardTitle>
              {c.description && (
                <p className="text-gray-400 text-sm mt-1">{c.description}</p>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <Crown size={14} className="text-brand-gold" />
                <span className="text-sm font-medium text-brand-gold">Declare Winners</span>
                <Badge className="bg-brand-accent text-gray-300 text-xs">
                  {c.submitters.length} full-form submissions
                </Badge>
              </div>
              <WinnerDeclaration cotwId={c.id} submitters={c.submitters} />
            </CardContent>
          </Card>
        ))}

        {challengesWithSubmitters.length === 0 && (
          <p className="text-gray-500 text-sm">No challenges created yet.</p>
        )}
      </div>
    </div>
  )
}
