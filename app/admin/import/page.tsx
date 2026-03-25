export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth'
import { getOne } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Download, Terminal, CheckSquare } from 'lucide-react'

interface CountRow {
  count: string
}

export default async function ImportPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/dashboard')
  }

  const [users, activities, streakSubmissions, cotwSubmissions, scoreCache] = await Promise.all([
    getOne<CountRow>('SELECT COUNT(*) as count FROM users', []),
    getOne<CountRow>('SELECT COUNT(*) as count FROM strava_activities', []),
    getOne<CountRow>('SELECT COUNT(*) as count FROM streak_submissions', []),
    getOne<CountRow>('SELECT COUNT(*) as count FROM cotw_submissions', []),
    getOne<CountRow>('SELECT COUNT(*) as count FROM score_cache', []),
  ])

  const stats = [
    { label: 'Users', value: users?.count ?? '0' },
    { label: 'Activities', value: activities?.count ?? '0' },
    { label: 'Streak Submissions', value: streakSubmissions?.count ?? '0' },
    { label: 'COTW Submissions', value: cotwSubmissions?.count ?? '0' },
    { label: 'Score Cache Entries', value: scoreCache?.count ?? '0' },
  ]

  const checklist = [
    'Run migration script and verify row counts above',
    'Check that all users have correct strava_id values',
    'Verify team assignments match original Season 7 roster',
    'Confirm streak enrollments are correct for each user',
    'Review COTW submissions — check participation flags',
    'Validate score_cache totals match manual calculations',
    'Activate the Season 7 season in the Seasons tab',
    'Trigger a Force Sync from the Overview tab',
    'Check leaderboard renders correctly in the portal',
    'Announce go-live to challengers',
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Import</h1>
        <p className="text-gray-400 text-sm mt-1">
          Season 7 data migration from Google Sheets
        </p>
      </div>

      {/* DB Stats */}
      <Card className="bg-brand-mid border-brand-accent">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Download size={18} className="text-brand-orange" />
            Database Stats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-3">
            {stats.map(({ label, value }) => (
              <div
                key={label}
                className="bg-brand-accent/30 border border-brand-accent rounded-lg p-3 text-center"
              >
                <p className="text-2xl font-bold font-mono text-brand-orange">
                  {parseInt(value).toLocaleString()}
                </p>
                <p className="text-xs text-gray-400 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Migration script */}
      <Card className="bg-brand-mid border-brand-accent">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Terminal size={18} className="text-brand-orange" />
            Migration Script
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-400 text-sm">
            Run the following command from your project root to import Season 7 data from Google
            Sheets into the database:
          </p>
          <div className="bg-black/60 border border-brand-accent rounded-md px-4 py-3 font-mono text-sm text-green-400">
            <span className="text-gray-500">$ </span>python scripts/migrate_almaden.py
          </div>
          <p className="text-gray-500 text-xs">
            Requires Python 3.9+, <code className="text-brand-gold">gspread</code>, and a valid{' '}
            <code className="text-brand-gold">DATABASE_URL</code> in your environment. The script
            is idempotent — safe to re-run.
          </p>
        </CardContent>
      </Card>

      {/* Post-import checklist */}
      <Card className="bg-brand-mid border-brand-accent">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <CheckSquare size={18} className="text-brand-orange" />
            Post-Import Checklist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {checklist.map((item, i) => (
              <label
                key={i}
                className="flex items-start gap-3 py-2 px-3 rounded-md hover:bg-brand-accent/20 cursor-pointer group"
              >
                <input
                  type="checkbox"
                  className="mt-0.5 w-4 h-4 rounded border-brand-accent bg-brand-dark accent-brand-orange cursor-pointer flex-shrink-0"
                />
                <span className="text-sm text-gray-300 group-has-[:checked]:line-through group-has-[:checked]:text-gray-600 transition-colors">
                  {item}
                </span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
