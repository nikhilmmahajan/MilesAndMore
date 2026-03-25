export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth'
import { getOne } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Shield, RefreshCw } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { SyncButton } from './SyncButton'

export default async function AdminOverviewPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/dashboard')
  }

  const [challengers, activeTeams, syncInfo] = await Promise.all([
    getOne<{ count: string }>('SELECT COUNT(*) as count FROM users', []),
    getOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM teams t
       JOIN seasons s ON t.season_id = s.id
       WHERE s.status = 'active'`,
      []
    ),
    getOne<{ last_sync: string | null }>('SELECT MAX(last_synced_at) as last_sync FROM users', []),
  ])

  const stats = [
    {
      label: 'Total Challengers',
      value: challengers?.count ?? '0',
      icon: Users,
      color: 'text-brand-orange',
    },
    {
      label: 'Active Teams',
      value: activeTeams?.count ?? '0',
      icon: Shield,
      color: 'text-brand-gold',
    },
    {
      label: 'Last Strava Sync',
      value: syncInfo?.last_sync ? formatDate(syncInfo.last_sync, 'MMM d, h:mm a') : 'Never',
      icon: RefreshCw,
      color: 'text-green-400',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Admin Overview</h1>
        <p className="text-gray-400 text-sm mt-1">Almaden Fit AF — Season management dashboard</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="bg-brand-mid border-brand-accent">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">{label}</CardTitle>
              <Icon size={18} className={color} />
            </CardHeader>
            <CardContent>
              <p className={`text-3xl font-bold ${color}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Force Sync */}
      <Card className="bg-brand-mid border-brand-accent">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <RefreshCw size={18} className="text-brand-orange" />
            Force Strava Sync
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-gray-400 text-sm">
            Triggers a full sync of all users&apos; Strava activities for the active season, then
            recalculates all scores. This may take a minute or two.
          </p>
          <SyncButton />
        </CardContent>
      </Card>
    </div>
  )
}
