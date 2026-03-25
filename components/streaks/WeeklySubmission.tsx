'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getMondayString } from '@/lib/utils'
import type { StreakEnrollment, StreakSubmission } from '@/lib/types'

interface WeeklySubmissionProps {
  enrollment: StreakEnrollment
  currentSubmission: StreakSubmission | null
  benchCount: number
  seasonId: string
  onSuccess: () => void
}

type SubmitPayload = {
  week_start_date: string
  completed: boolean
  bench_mode?: boolean
}

export function WeeklySubmission({
  enrollment,
  currentSubmission,
  benchCount,
  seasonId,
  onSuccess,
}: WeeklySubmissionProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [submission, setSubmission] = useState<StreakSubmission | null>(currentSubmission)
  const [error, setError] = useState<string | null>(null)

  async function submit(payload: SubmitPayload) {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/streaks/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to submit')
      }
      const data = await res.json()
      setSubmission(data.submission ?? { ...payload, points_awarded: 0 })
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  const weekStart = getMondayString()
  const benchUsed = benchCount >= 2

  if (submission) {
    const isDone = submission.completed
    const isBench = submission.bench_mode
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">This Week&apos;s Check-In</CardTitle>
            {isDone && <Badge variant="success">✅ Done</Badge>}
            {isBench && !isDone && (
              <Badge className="bg-yellow-700/80 text-yellow-200">🪑 Bench</Badge>
            )}
            {!isDone && !isBench && (
              <Badge className="bg-gray-700 text-gray-300">❌ Missed</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-400">
            {enrollment.track_name} · {enrollment.level}
          </p>
          {submission.points_awarded > 0 && (
            <p className="mt-2 text-sm font-semibold text-brand-gold">
              +{submission.points_awarded} pts
            </p>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">This Week&apos;s Check-In</CardTitle>
        <p className="text-xs text-gray-500">Submit by Sunday midnight PST</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-gray-400">
          {enrollment.track_name} · {enrollment.level}
        </p>

        <div className="flex flex-col gap-2">
          {/* Yes */}
          <Button
            disabled={isLoading}
            onClick={() => submit({ week_start_date: weekStart, completed: true })}
            className="w-full bg-green-700 text-white hover:bg-green-600"
          >
            ✅ Yes, I did it!
          </Button>

          {/* No */}
          <Button
            variant="outline"
            disabled={isLoading}
            onClick={() => submit({ week_start_date: weekStart, completed: false })}
            className="w-full"
          >
            ❌ Not this week
          </Button>

          {/* Bench */}
          <div className="space-y-1">
            <Button
              variant="ghost"
              disabled={isLoading || benchUsed}
              onClick={() =>
                submit({ week_start_date: weekStart, completed: false, bench_mode: true })
              }
              className="w-full text-yellow-400 hover:bg-yellow-900/30 hover:text-yellow-300 disabled:text-gray-600"
            >
              🪑 Declare Bench
            </Button>
            <p className="text-center text-xs text-gray-500">
              {benchUsed
                ? 'Both bench weeks used'
                : 'Vacation/illness — paused, not broken. Max 2/season.'}
            </p>
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
      </CardContent>
    </Card>
  )
}
