export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth'
import { getMany } from '@/lib/db'
import type { Season } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CalendarDays } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { SeasonCreateForm } from './SeasonCreateForm'
import { ActivateSeasonButton } from './ActivateSeasonButton'

export default async function SeasonsPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/dashboard')
  }

  const seasons = await getMany<Season>(
    'SELECT * FROM seasons ORDER BY start_date DESC',
    []
  )

  function statusBadge(status: Season['status']) {
    if (status === 'active')
      return <Badge className="bg-green-600 text-white text-xs">LIVE</Badge>
    if (status === 'upcoming')
      return <Badge className="bg-blue-600 text-white text-xs">Upcoming</Badge>
    return <Badge className="bg-gray-600 text-white text-xs">Archived</Badge>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Seasons</h1>
        <p className="text-gray-400 text-sm mt-1">Manage challenge seasons</p>
      </div>

      {/* Seasons table */}
      <Card className="bg-brand-mid border-brand-accent">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <CalendarDays size={18} className="text-brand-orange" />
            All Seasons
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {seasons.length === 0 ? (
            <p className="text-gray-500 text-sm p-6">No seasons found.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-accent">
                  <th className="text-left text-gray-400 font-medium px-6 py-3">Name</th>
                  <th className="text-left text-gray-400 font-medium px-4 py-3">Start</th>
                  <th className="text-left text-gray-400 font-medium px-4 py-3">End</th>
                  <th className="text-left text-gray-400 font-medium px-4 py-3">Status</th>
                  <th className="text-left text-gray-400 font-medium px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {seasons.map((s) => (
                  <tr key={s.id} className="border-b border-brand-accent/40 hover:bg-brand-accent/20">
                    <td className="px-6 py-3 font-medium text-white">{s.name}</td>
                    <td className="px-4 py-3 text-gray-300">{formatDate(s.start_date, 'MMM d, yyyy')}</td>
                    <td className="px-4 py-3 text-gray-300">{formatDate(s.end_date, 'MMM d, yyyy')}</td>
                    <td className="px-4 py-3">{statusBadge(s.status)}</td>
                    <td className="px-4 py-3">
                      {s.status !== 'active' && (
                        <ActivateSeasonButton seasonId={s.id} seasonName={s.name} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <SeasonCreateForm />
    </div>
  )
}
