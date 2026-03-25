export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth'
import { getOne, getMany } from '@/lib/db'
import type { Season, Team, User, BonusPoint } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Gift } from 'lucide-react'
import { formatDate, formatScore } from '@/lib/utils'
import { BonusForm } from './BonusForm'

interface BonusAuditRow extends BonusPoint {
  recipient_name: string
  team_name: string | null
  admin_name: string
}

export default async function BonusesPage() {
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
        <h1 className="text-2xl font-bold text-white">Bonuses</h1>
        <p className="text-gray-400">No active season found.</p>
      </div>
    )
  }

  const [users, teams, bonuses] = await Promise.all([
    getMany<User>('SELECT * FROM users ORDER BY name', []),
    getMany<Team>('SELECT * FROM teams WHERE season_id = $1 ORDER BY name', [season.id]),
    getMany<BonusAuditRow>(
      `SELECT bp.*, u.name as recipient_name, t.name as team_name, au.name as admin_name
       FROM bonus_points bp
       JOIN users u ON u.id = bp.user_id
       LEFT JOIN teams t ON t.id = bp.team_id
       LEFT JOIN users au ON au.id = bp.awarded_by::uuid
       WHERE bp.season_id = $1
       ORDER BY bp.created_at DESC
       LIMIT 100`,
      [season.id]
    ),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Bonuses</h1>
        <p className="text-gray-400 text-sm mt-1">
          Active season: <span className="text-brand-gold">{season.name}</span>
        </p>
      </div>

      <BonusForm seasonId={season.id} users={users} teams={teams} />

      {/* Audit Table */}
      <Card className="bg-brand-mid border-brand-accent">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Gift size={18} className="text-brand-orange" />
            Bonus Audit Log
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {bonuses.length === 0 ? (
            <p className="text-gray-500 text-sm p-6">No bonuses awarded yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-accent">
                  <th className="text-left text-gray-400 font-medium px-6 py-3">Date</th>
                  <th className="text-left text-gray-400 font-medium px-4 py-3">Recipient</th>
                  <th className="text-left text-gray-400 font-medium px-4 py-3">Reason</th>
                  <th className="text-right text-gray-400 font-medium px-4 py-3">Points</th>
                  <th className="text-left text-gray-400 font-medium px-4 py-3">Awarded By</th>
                </tr>
              </thead>
              <tbody>
                {bonuses.map((b) => (
                  <tr key={b.id} className="border-b border-brand-accent/40 hover:bg-brand-accent/20">
                    <td className="px-6 py-3 text-gray-400 whitespace-nowrap">
                      {formatDate(b.created_at, 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-3 text-white">
                      {b.team_name ? (
                        <span>
                          <span className="text-brand-gold">{b.team_name}</span>
                          <span className="text-gray-500 text-xs ml-1">({b.recipient_name})</span>
                        </span>
                      ) : (
                        b.recipient_name
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-300 max-w-xs truncate">{b.reason}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-brand-orange font-mono font-semibold">
                        +{formatScore(b.points)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{b.admin_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
