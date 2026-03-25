export const dynamic = 'force-dynamic'
import { requireUser } from '@/lib/auth'
import { getMany } from '@/lib/db'
import type { Season } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'

interface HofEntryRow {
  id: string
  season_id: string
  category: string
  user_id: string | null
  team_id: string | null
  value: string | null
  week_start_date: string | null
  created_at: string
  user_name: string | null
  team_name: string | null
}

const CATEGORY_LABELS: Record<string, string> = {
  cotw_weekly_champion_m: '⚡ Male COTW Champion',
  cotw_weekly_champion_f: '⚡ Female COTW Champion',
  season_streak_champion: '🔥 Streak Champion',
  season_top_scorer_m: '🥇 Top Male Scorer',
  season_top_scorer_f: '🥇 Top Female Scorer',
  season_team_champion: '🏆 Team Champion',
  most_minutes: '⏱️ Most Minutes',
}

export default async function HallOfFamePage() {
  await requireUser()

  const seasons = await getMany<Season>(
    `SELECT * FROM seasons ORDER BY start_date DESC`
  )

  const hofEntries = await getMany<HofEntryRow>(
    `SELECT hof.*,
       u.name AS user_name,
       t.name AS team_name
     FROM hall_of_fame hof
     LEFT JOIN users u ON hof.user_id = u.id
     LEFT JOIN teams t ON hof.team_id = t.id
     ORDER BY hof.created_at DESC`
  )

  const hofBySeason: Record<string, HofEntryRow[]> = {}
  for (const entry of hofEntries) {
    if (!hofBySeason[entry.season_id]) hofBySeason[entry.season_id] = []
    hofBySeason[entry.season_id].push(entry)
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Hall of Fame</h2>
        <p className="text-sm text-gray-400 mt-1">Season champions and record holders</p>
      </div>

      {seasons.map(season => {
        const entries = hofBySeason[season.id] ?? []
        return (
          <div key={season.id}>
            <h3 className="text-xl font-semibold mb-4">{season.name}</h3>
            {entries.length === 0 ? (
              <p className="text-gray-500 text-sm">
                Season awards will appear here when the season concludes.
              </p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {entries.map(entry => (
                  <Card key={entry.id} className="border-brand-gold">
                    <CardContent className="p-4">
                      <p className="text-xs text-brand-gold font-semibold">
                        {CATEGORY_LABELS[entry.category] ?? entry.category}
                      </p>
                      <p className="font-bold mt-1">
                        {entry.user_name ?? entry.team_name ?? '—'}
                      </p>
                      {entry.value && (
                        <p className="text-sm text-gray-400 font-mono">{entry.value}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
