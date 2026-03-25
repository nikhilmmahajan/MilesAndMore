export const dynamic = 'force-dynamic'
import { requireUser } from '@/lib/auth'
import { getOne, getMany } from '@/lib/db'
import { cn, formatScore } from '@/lib/utils'
import type { User } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { notFound } from 'next/navigation'

interface SeasonScore {
  season_id: string
  season_name: string
  total: number
  rank: number | null
  cotw_stamps: { cotw_id: string; participated: boolean }[] | null
}

interface RivalryRow {
  id: string
  challenger_id: string
  opponent_id: string
  status: string
  challenger_name: string
  opponent_name: string
}

export default async function ProfilePage({ params }: { params: { id: string } }) {
  await requireUser()

  const profileUser = await getOne<User>(
    `SELECT * FROM users WHERE id = $1`,
    [params.id]
  )

  if (!profileUser) notFound()

  // Season scores across all seasons
  const seasonScores = await getMany<SeasonScore>(
    `SELECT
       sc.season_id,
       s.name AS season_name,
       sc.total,
       sc.rank
     FROM score_cache sc
     JOIN seasons s ON sc.season_id = s.id
     WHERE sc.user_id = $1
     ORDER BY s.start_date DESC`,
    [profileUser.id]
  )

  // Enrich each season score with COTW stamps
  const enrichedSeasonScores = await Promise.all(
    seasonScores.map(async ss => {
      const stamps = await getMany<{ cotw_id: string; participated: boolean }>(
        `SELECT
           cc.id AS cotw_id,
           EXISTS(
             SELECT 1 FROM cotw_submissions cs
             WHERE cs.cotw_id = cc.id AND cs.user_id = $1 AND cs.participation != 'did_not_do'
           ) AS participated
         FROM cotw_challenges cc
         WHERE cc.season_id = $2
         ORDER BY cc.week_start_date ASC`,
        [profileUser.id, ss.season_id]
      )
      return { ...ss, cotw_stamps: stamps }
    })
  )

  // Rivalries
  const rivalries = await getMany<RivalryRow>(
    `SELECT
       r.*,
       uc.name AS challenger_name,
       uo.name AS opponent_name
     FROM rivalries r
     JOIN users uc ON r.challenger_id = uc.id
     JOIN users uo ON r.opponent_id = uo.id
     WHERE r.challenger_id = $1 OR r.opponent_id = $1
     ORDER BY r.created_at DESC`,
    [profileUser.id]
  )

  return (
    <div className="max-w-2xl space-y-6">
      {/* Profile header */}
      <div className="flex items-center gap-4">
        <img
          src={profileUser.photo_url ?? '/icons/default-avatar.png'}
          alt={profileUser.name}
          className="w-16 h-16 rounded-full border-2 border-brand-orange object-cover"
        />
        <div>
          <h2 className="text-2xl font-bold">{profileUser.name}</h2>
          <p className="text-sm text-gray-400">
            {profileUser.gender === 'M'
              ? 'Male'
              : profileUser.gender === 'F'
              ? 'Female'
              : ''}
          </p>
          {profileUser.strava_url && (
            <a
              href={profileUser.strava_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-brand-orange hover:underline"
            >
              View on Strava ↗
            </a>
          )}
        </div>
      </div>

      {/* Season Passport */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Season Passport</h3>
        {enrichedSeasonScores.length === 0 ? (
          <p className="text-gray-500 text-sm">No season data yet.</p>
        ) : (
          enrichedSeasonScores.map(ss => (
            <Card key={ss.season_id} className="mb-3">
              <CardContent className="p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold">{ss.season_name}</span>
                  <span className="font-mono text-brand-orange">
                    {formatScore(ss.total)} pts{ss.rank ? ` • #${ss.rank}` : ''}
                  </span>
                </div>
                {ss.cotw_stamps && ss.cotw_stamps.length > 0 && (
                  <div className="flex gap-1 flex-wrap mt-2">
                    {ss.cotw_stamps.map(stamp => (
                      <div
                        key={stamp.cotw_id}
                        className={cn(
                          'w-6 h-6 rounded-sm',
                          stamp.participated ? 'bg-green-700' : 'bg-gray-800'
                        )}
                        title={stamp.participated ? 'Participated' : 'Missed'}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Rivalries */}
      {rivalries.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Rivalries</h3>
          {rivalries.map(r => (
            <Card key={r.id} className="mb-2">
              <CardContent className="p-3 flex items-center justify-between">
                <span>
                  {r.challenger_name} ⚔️ {r.opponent_name}
                </span>
                <Badge variant={r.status === 'active' ? 'default' : 'secondary'}>
                  {r.status}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
