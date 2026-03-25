export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth'
import { getOne } from '@/lib/db'
import type { Season } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Flag } from 'lucide-react'
import { ActivityFlagManager } from './ActivityFlagManager'

export default async function ActivitiesPage() {
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
        <h1 className="text-2xl font-bold text-white">Activities</h1>
        <p className="text-gray-400">No active season found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Activities</h1>
        <p className="text-gray-400 text-sm mt-1">
          Flag or unflag individual Strava activities. Flagged activities are excluded from scoring.
        </p>
      </div>

      <Card className="bg-brand-mid border-brand-accent">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Flag size={18} className="text-brand-orange" />
            Activity Flag Manager
            <span className="text-sm font-normal text-gray-400">
              — Season: <span className="text-brand-gold">{season.name}</span>
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityFlagManager seasonId={season.id} />
        </CardContent>
      </Card>
    </div>
  )
}
