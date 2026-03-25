'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { CotwChallenge, CotwSubmission, CotwWinner, User } from '@/lib/types'

type ParticipationOption = 'full_form' | 'assisted' | 'did_not_do'

interface SubmissionCount {
  full_form: number
  assisted: number
  did_not_do: number
}

interface ChallengeCardProps {
  challenge: CotwChallenge
  submission: CotwSubmission | null
  winners: (CotwWinner & { user: { name: string; photo_url: string | null } })[]
  submissionCount: SubmissionCount
}

const PARTICIPATION_OPTIONS: {
  value: ParticipationOption
  emoji: string
  label: string
  sublabel: string
}[] = [
  { value: 'full_form', emoji: '💪', label: 'Nailed It', sublabel: 'Full form' },
  { value: 'assisted', emoji: '🤝', label: 'Assisted', sublabel: 'Modified' },
  { value: 'did_not_do', emoji: '❌', label: 'Skipped', sublabel: 'Did not do' },
]

function getPointsPreview(challenge: CotwChallenge, participation: ParticipationOption): number {
  if (participation === 'did_not_do') return 0
  const rules = challenge.scoring_rules as Record<string, number>
  if (participation === 'full_form') return rules.full_form ?? challenge.participation_pts
  if (participation === 'assisted') return rules.assisted ?? Math.floor(challenge.participation_pts / 2)
  return 0
}

export function ChallengeCard({
  challenge,
  submission,
  winners,
  submissionCount,
}: ChallengeCardProps) {
  const [participation, setParticipation] = useState<ParticipationOption | null>(null)
  const [scoreText, setScoreText] = useState('')
  const [notes, setNotes] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [submitted, setSubmitted] = useState<CotwSubmission | null>(submission)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!participation) return
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/cotw/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cotw_id: challenge.id,
          participation,
          score_text: scoreText || null,
          strava_notes: notes || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to submit')
      }
      const data = await res.json()
      setSubmitted(data.submission ?? { participation, score_text: scoreText, points_awarded: 0 })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  const maleWinner = winners.find((w) => w.gender === 'M')
  const femaleWinner = winners.find((w) => w.gender === 'F')

  return (
    <div className="space-y-4">
      {/* Challenge info */}
      <Card className="ring-1 ring-brand-orange/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl text-brand-orange">{challenge.title}</CardTitle>
          {challenge.description && (
            <p className="text-sm text-gray-300 leading-relaxed">{challenge.description}</p>
          )}
          {challenge.video_url && (
            <a
              href={challenge.video_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-brand-orange hover:underline"
            >
              ▶ Watch Demo
            </a>
          )}
        </CardHeader>
        <CardContent>
          <p className="text-xs text-gray-500">
            ✅ {submissionCount.full_form} full form · 🤝 {submissionCount.assisted} assisted · ❌{' '}
            {submissionCount.did_not_do} skipped
          </p>
        </CardContent>
      </Card>

      {/* Winners banner */}
      {(maleWinner || femaleWinner) && (
        <Card className="border-brand-gold/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-brand-gold">🏆 This Week&apos;s Champions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {maleWinner && (
                <div className="rounded-lg bg-brand-accent p-3 text-center">
                  <p className="text-xs text-gray-400 mb-1">Male Champion</p>
                  {maleWinner.user.photo_url ? (
                    <img
                      src={maleWinner.user.photo_url}
                      alt={maleWinner.user.name}
                      className="w-10 h-10 rounded-full mx-auto mb-1 object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full mx-auto mb-1 bg-brand-mid flex items-center justify-center text-lg">
                      🏆
                    </div>
                  )}
                  <p className="text-sm font-semibold">{maleWinner.user.name}</p>
                </div>
              )}
              {femaleWinner && (
                <div className="rounded-lg bg-brand-accent p-3 text-center">
                  <p className="text-xs text-gray-400 mb-1">Female Champion</p>
                  {femaleWinner.user.photo_url ? (
                    <img
                      src={femaleWinner.user.photo_url}
                      alt={femaleWinner.user.name}
                      className="w-10 h-10 rounded-full mx-auto mb-1 object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full mx-auto mb-1 bg-brand-mid flex items-center justify-center text-lg">
                      🏆
                    </div>
                  )}
                  <p className="text-sm font-semibold">{femaleWinner.user.name}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submission or form */}
      {submitted ? (
        <Card className="border-green-700">
          <CardContent className="pt-6 space-y-2">
            <p className="font-semibold text-green-400">✅ Entry submitted!</p>
            <div className="text-sm text-gray-300 space-y-1">
              <p>
                <span className="text-gray-500">Participation:</span>{' '}
                {submitted.participation === 'full_form'
                  ? '💪 Nailed It'
                  : submitted.participation === 'assisted'
                  ? '🤝 Assisted'
                  : '❌ Skipped'}
              </p>
              {submitted.score_text && (
                <p>
                  <span className="text-gray-500">Score:</span> {submitted.score_text}
                </p>
              )}
            </div>
            {submitted.points_awarded > 0 && (
              <p className="text-sm font-semibold text-brand-gold">
                +{submitted.points_awarded} pts
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Submit Your Entry</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Step 1: Participation */}
              <div className="grid grid-cols-3 gap-2">
                {PARTICIPATION_OPTIONS.map((opt) => {
                  const pts = getPointsPreview(challenge, opt.value)
                  const isActive = participation === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setParticipation(opt.value)}
                      className={cn(
                        'rounded-lg border p-3 text-center transition-colors cursor-pointer',
                        isActive
                          ? 'border-brand-orange bg-brand-orange/20'
                          : 'border-brand-accent bg-brand-mid hover:border-brand-orange/50'
                      )}
                    >
                      <div className="text-xl mb-1">{opt.emoji}</div>
                      <div className="text-xs font-semibold text-white">{opt.label}</div>
                      <div className="text-xs text-gray-400">{opt.sublabel}</div>
                      {pts > 0 && (
                        <div className="text-xs text-brand-gold mt-1">+{pts} pts</div>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Step 2: Score */}
              {(participation === 'full_form' || participation === 'assisted') && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-300">
                    Your score (reps, time, distance…)
                  </label>
                  <input
                    type="text"
                    value={scoreText}
                    onChange={(e) => setScoreText(e.target.value)}
                    placeholder="e.g. 20 reps, 3:45, 5km"
                    className="w-full rounded-md border border-brand-accent bg-brand-dark px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-orange"
                  />
                </div>
              )}

              {/* Step 3: Notes */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-300">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Any context, modifications, how it felt…"
                  className="w-full rounded-md border border-brand-accent bg-brand-dark px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-orange resize-none"
                />
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <Button
                type="submit"
                disabled={isLoading || !participation}
                className="w-full"
              >
                {isLoading ? 'Submitting…' : 'Submit Entry'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
