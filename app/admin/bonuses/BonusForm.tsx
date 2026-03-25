'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Gift, CheckCircle, AlertCircle } from 'lucide-react'
import type { User, Team } from '@/lib/types'

interface Props {
  seasonId: string
  users: User[]
  teams: Team[]
}

export function BonusForm({ seasonId, users, teams }: Props) {
  const [mode, setMode] = useState<'individual' | 'team'>('individual')
  const [userId, setUserId] = useState('')
  const [teamId, setTeamId] = useState('')
  const [points, setPoints] = useState('')
  const [week, setWeek] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (mode === 'individual' && !userId) {
      setResult({ ok: false, message: 'Please select a user.' })
      return
    }
    if (mode === 'team' && !teamId) {
      setResult({ ok: false, message: 'Please select a team.' })
      return
    }
    setLoading(true)
    setResult(null)
    try {
      const body: Record<string, unknown> = {
        season_id: seasonId,
        points: parseInt(points),
        week_start_date: week,
        reason,
      }
      if (mode === 'individual') body.user_id = userId
      else body.team_id = teamId

      const res = await fetch('/api/admin/bonuses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        setResult({ ok: false, message: data.error ?? 'Failed to award bonus' })
      } else {
        setResult({ ok: true, message: 'Bonus awarded successfully.' })
        setUserId('')
        setTeamId('')
        setPoints('')
        setWeek('')
        setReason('')
        window.location.reload()
      }
    } catch {
      setResult({ ok: false, message: 'Network error.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="bg-brand-mid border-brand-accent">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Gift size={18} className="text-brand-orange" />
          Award Bonus Points
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Toggle */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode('individual')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                mode === 'individual'
                  ? 'bg-brand-orange text-white'
                  : 'bg-brand-accent text-gray-300 hover:text-white'
              }`}
            >
              Individual
            </button>
            <button
              type="button"
              onClick={() => setMode('team')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                mode === 'team'
                  ? 'bg-brand-orange text-white'
                  : 'bg-brand-accent text-gray-300 hover:text-white'
              }`}
            >
              Team
            </button>
          </div>

          {mode === 'individual' ? (
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Challenger</label>
              <select
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                required
                className="admin-input w-full"
              >
                <option value="">— Select Challenger —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="text-sm text-gray-400 mb-1 block">
                Team <span className="text-gray-500">(points split evenly among members)</span>
              </label>
              <select
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                required
                className="admin-input w-full"
              >
                <option value="">— Select Team —</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Points</label>
              <Input
                type="number"
                value={points}
                onChange={(e) => setPoints(e.target.value)}
                placeholder="e.g. 100"
                required
                min={1}
                className="admin-input w-full"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Week Start Date</label>
              <Input
                type="date"
                value={week}
                onChange={(e) => setWeek(e.target.value)}
                required
                className="admin-input w-full"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1 block">Reason</label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Community event participation"
              required
              className="admin-input w-full"
            />
          </div>

          <div className="flex items-center gap-4">
            <Button
              type="submit"
              disabled={loading}
              className="bg-brand-orange hover:bg-brand-orange/80 text-white"
            >
              {loading ? 'Awarding…' : 'Award Bonus'}
            </Button>
            {result && (
              <div
                className={`flex items-center gap-2 text-sm ${result.ok ? 'text-green-400' : 'text-red-400'}`}
              >
                {result.ok ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                {result.message}
              </div>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
