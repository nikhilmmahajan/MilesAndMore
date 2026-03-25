'use client'

import { useState } from 'react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { ScoreBreakdown } from '@/components/leaderboard/ScoreBreakdown'
import { cn, formatRank, formatDelta, formatScore } from '@/lib/utils'
import type { LeaderboardRow } from '@/lib/types'

interface LeaderboardRowProps {
  row: LeaderboardRow
  isCurrentUser: boolean
  rank: number
}

export function LeaderboardRow({ row, isCurrentUser, rank }: LeaderboardRowProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const delta = formatDelta(row.prev_rank, row.rank)
  const isTopThree = rank <= 3
  const fallbackInitial = row.name.charAt(0).toUpperCase()

  return (
    <div className="mb-2">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsExpanded((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') setIsExpanded((prev) => !prev)
        }}
        className={cn(
          'flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors hover:bg-brand-accent/20',
          isCurrentUser
            ? 'border-brand-orange bg-brand-orange/10'
            : 'border-brand-accent bg-brand-mid'
        )}
      >
        {/* Rank */}
        <div className="w-10 shrink-0 text-center">
          {isTopThree ? (
            <span className="text-xl leading-none">{formatRank(rank)}</span>
          ) : (
            <span className="font-mono text-sm text-gray-400">{formatRank(rank)}</span>
          )}
        </div>

        {/* Delta */}
        <div className="w-12 shrink-0 text-center text-xs">
          {delta ? (
            <span className={delta.color}>{delta.symbol}</span>
          ) : (
            <span className="text-gray-600">—</span>
          )}
        </div>

        {/* Avatar */}
        <Avatar className="h-8 w-8 shrink-0">
          {row.photo_url && <AvatarImage src={row.photo_url} alt={row.name} />}
          <AvatarFallback>{fallbackInitial}</AvatarFallback>
        </Avatar>

        {/* Name + Team */}
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-white">{row.name}</p>
          {row.team_name && (
            <p className="truncate text-xs text-gray-400">{row.team_name}</p>
          )}
        </div>

        {/* Score */}
        <div className="shrink-0 text-right">
          <p className="font-mono text-lg font-bold text-brand-orange">
            {formatScore(row.total)}
          </p>
          <p className="text-xs text-gray-500">pts</p>
        </div>
      </div>

      <ScoreBreakdown
        strava_pts={row.strava_pts}
        streak_pts={row.streak_pts}
        cotw_pts={row.cotw_pts}
        bonus_pts={row.bonus_pts}
        total={row.total}
        isOpen={isExpanded}
      />
    </div>
  )
}
