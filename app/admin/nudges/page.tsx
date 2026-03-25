export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth'
import { getOne, getMany } from '@/lib/db'
import type { Season } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Bell } from 'lucide-react'
import { NudgeManager } from './NudgeManager'

interface InactiveUser {
  id: string
  name: string
  photo_url: string | null
  last_synced_at: string | null
}

export default async function NudgesPage() {
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
        <h1 className="text-2xl font-bold text-white">Nudges</h1>
        <p className="text-gray-400">No active season found.</p>
      </div>
    )
  }

  const inactiveUsers = await getMany<InactiveUser>(
    `SELECT DISTINCT u.id, u.name, u.photo_url, u.last_synced_at
     FROM users u
     JOIN team_members tm ON tm.user_id = u.id AND tm.season_id = $1
     WHERE u.last_synced_at < NOW() - INTERVAL '5 days'
        OR u.last_synced_at IS NULL
     ORDER BY u.last_synced_at ASC NULLS FIRST`,
    [season.id]
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Nudges</h1>
        <p className="text-gray-400 text-sm mt-1">
          Send motivational nudges to inactive challengers. Inactive = no Strava sync in the last 5
          days.
        </p>
      </div>

      <Card className="bg-brand-mid border-brand-accent">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Bell size={18} className="text-brand-orange" />
            Inactive Challengers
            <span className="text-sm font-normal text-gray-400">
              — <span className="text-brand-gold">{inactiveUsers.length}</span> need a nudge
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <NudgeManager inactiveUsers={inactiveUsers} />
        </CardContent>
      </Card>
    </div>
  )
}
