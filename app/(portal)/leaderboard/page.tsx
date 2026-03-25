export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { getOne, getMany } from '@/lib/db'
import type { Season, LeaderboardRow, TeamLeaderboardRow } from '@/lib/types'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { IndividualLeaderboard } from '@/components/leaderboard/IndividualLeaderboard'
import { TeamLeaderboard } from '@/components/leaderboard/TeamLeaderboard'

export default async function LeaderboardPage() {
  let user
  try {
    user = await requireUser()
  } catch {
    redirect('/login')
  }

  const season = await getOne<Season>(
    "SELECT * FROM seasons WHERE status = 'active' LIMIT 1"
  )

  const rows = season
    ? await getMany<LeaderboardRow>(
        'SELECT * FROM v_leaderboard WHERE season_id = $1 ORDER BY rank ASC',
        [season.id]
      )
    : []

  const teamRows = season
    ? await getMany<TeamLeaderboardRow>(
        'SELECT * FROM v_team_leaderboard WHERE season_id = $1 ORDER BY rank ASC',
        [season.id]
      )
    : []

  return (
    <div>
      <h2 className="text-2xl font-bold text-white">Leaderboard</h2>
      <p className="mt-1 text-sm text-gray-400">{season?.name ?? 'Season'}</p>

      <Tabs defaultValue="individual" className="mt-6">
        <TabsList>
          <TabsTrigger value="individual">Individual</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
        </TabsList>

        <TabsContent value="individual">
          <IndividualLeaderboard initialRows={rows} currentUserId={user.id} />
        </TabsContent>

        <TabsContent value="teams">
          <TeamLeaderboard rows={teamRows} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
