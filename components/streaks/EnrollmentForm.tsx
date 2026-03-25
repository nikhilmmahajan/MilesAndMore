'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Season, StreakEnrollment, TrackConfig } from '@/lib/types'

interface EnrollmentFormProps {
  season: Season
  enrollment: StreakEnrollment | null
}

export function EnrollmentForm({ season, enrollment }: EnrollmentFormProps) {
  const [trackName, setTrackName] = useState<string>(
    enrollment?.track_name ?? season.track_config[0]?.name ?? ''
  )
  const [level, setLevel] = useState<string>(enrollment?.level ?? '')
  const [isLoading, setIsLoading] = useState(false)
  const [enrolled, setEnrolled] = useState(!!enrollment)
  const [error, setError] = useState<string | null>(null)

  const selectedTrack: TrackConfig | undefined = season.track_config.find(
    (t) => t.name === trackName
  )
  const selectedLevel = selectedTrack?.levels.find((l) => l.label === level)
  const pointsPerWeek = selectedLevel?.points_per_week ?? selectedTrack?.levels[0]?.points_per_week

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!trackName || !level) return
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/streaks/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ track_name: trackName, level }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to enroll')
      }
      setEnrolled(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  if (enrolled) {
    return (
      <Card className="border-green-700 bg-brand-mid">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Your Consistency Track</CardTitle>
            <Badge variant="success">Locked</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Track</span>
            <span className="font-medium">{enrollment?.track_name ?? trackName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Level</span>
            <span className="font-medium">{enrollment?.level ?? level}</span>
          </div>
          <p className="mt-3 text-xs text-brand-gold">Earns 50 pts/week</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Your Consistency Track</CardTitle>
        <p className="text-sm text-gray-400">
          Choose your track for this season. Once saved, it cannot be changed.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Track selector */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-300">Track</label>
            <select
              value={trackName}
              onChange={(e) => {
                setTrackName(e.target.value)
                setLevel('')
              }}
              className="w-full rounded-md border border-brand-accent bg-brand-dark px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-orange"
            >
              {season.track_config.map((t) => (
                <option key={t.name} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Level selector */}
          {selectedTrack && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">Level</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full rounded-md border border-brand-accent bg-brand-dark px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-orange"
              >
                <option value="" disabled>
                  Select a level…
                </option>
                {selectedTrack.levels.map((l) => (
                  <option key={l.label} value={l.label}>
                    {l.label} — {l.points_per_week} pts/week
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Points preview */}
          {level && pointsPerWeek !== undefined && (
            <p className="text-sm text-brand-gold">
              Earns {pointsPerWeek} pts/week for a Yes submission
            </p>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}

          <Button
            type="submit"
            disabled={isLoading || !trackName || !level}
            className="w-full"
          >
            {isLoading ? 'Saving…' : 'Lock In My Track'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
