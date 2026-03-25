'use client'

import { cn } from '@/lib/utils'
import { formatScore } from '@/lib/utils'

interface ScoreBreakdownProps {
  strava_pts: number
  streak_pts: number
  cotw_pts: number
  bonus_pts: number
  total: number
  isOpen: boolean
}

interface ScoreRow {
  label: string
  value: number
  colorClass: string
}

export function ScoreBreakdown({
  strava_pts,
  streak_pts,
  cotw_pts,
  bonus_pts,
  total,
  isOpen,
}: ScoreBreakdownProps) {
  const rows: ScoreRow[] = [
    { label: 'Strava Activity', value: strava_pts, colorClass: 'text-blue-400' },
    { label: 'Streak', value: streak_pts, colorClass: 'text-green-400' },
    { label: 'COTW', value: cotw_pts, colorClass: 'text-purple-400' },
    { label: 'Bonus', value: bonus_pts, colorClass: 'text-brand-gold' },
  ]

  return (
    <div
      className={cn(
        'overflow-hidden transition-all duration-300 ease-in-out',
        isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
      )}
    >
      <div className="mt-2 rounded-lg border border-brand-accent bg-brand-dark px-4 py-3">
        <div className="space-y-2">
          {rows.map(({ label, value, colorClass }) => (
            <div key={label} className="flex items-center justify-between text-sm">
              <span className="text-gray-400">{label}</span>
              <span className={cn('font-mono', colorClass)}>
                {formatScore(value)}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-brand-accent pt-3">
          <span className="text-sm font-semibold text-white">Total</span>
          <span className="font-mono text-lg font-bold text-brand-orange">
            {formatScore(total)}
          </span>
        </div>
      </div>
    </div>
  )
}
