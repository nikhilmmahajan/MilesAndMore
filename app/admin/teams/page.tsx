export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth'
import { getOne, getMany } from '@/lib/db'
import type { Season, Team, User } from '@/lib/types'
import { TeamsManager } from './TeamsManager'

interface TeamWithMembers extends Team {
  members: { user_id: string; name: string; photo_url: string | null }[]
}

export default async function TeamsPage() {
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
        <h1 className="text-2xl font-bold text-white">Teams</h1>
        <p className="text-gray-400">No active season found. Create and activate a season first.</p>
      </div>
    )
  }

  const [unassigned, teamsRaw, membersRaw] = await Promise.all([
    getMany<User>(
      `SELECT u.* FROM users u
       WHERE NOT EXISTS (
         SELECT 1 FROM team_members tm WHERE tm.user_id = u.id AND tm.season_id = $1
       )
       ORDER BY u.name`,
      [season.id]
    ),
    getMany<Team>(
      'SELECT * FROM teams WHERE season_id = $1 ORDER BY name',
      [season.id]
    ),
    getMany<{ team_id: string; user_id: string; name: string; photo_url: string | null }>(
      `SELECT tm.team_id, tm.user_id, u.name, u.photo_url
       FROM team_members tm
       JOIN users u ON u.id = tm.user_id
       WHERE tm.season_id = $1`,
      [season.id]
    ),
  ])

  const teamsWithMembers: TeamWithMembers[] = teamsRaw.map((t) => ({
    ...t,
    members: membersRaw.filter((m) => m.team_id === t.id),
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Teams</h1>
        <p className="text-gray-400 text-sm mt-1">
          Active season: <span className="text-brand-gold">{season.name}</span>
        </p>
      </div>

      <TeamsManager
        unassigned={unassigned}
        teams={teamsWithMembers}
        seasonId={season.id}
      />
    </div>
  )
}
