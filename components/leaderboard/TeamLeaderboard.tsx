'use client'

import { cn, formatRank, formatScore } from '@/lib/utils'
import type { TeamLeaderboardRow } from '@/lib/types'

interface TeamLeaderboardProps {
  rows: TeamLeaderboardRow[]
}

function TeamTrendsChart() {
  return (
    <div className="h-[300px] flex items-center justify-center text-gray-500 text-sm">
      Team Trends chart coming soon
    </div>
  )
}

export function TeamLeaderboard({ rows }: TeamLeaderboardProps) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-500">
        <span className="text-3xl">🏁</span>
        <p className="mt-2 text-sm">No teams yet this season.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="space-y-3">
        {rows.map((row) => {
          const isTopThree = row.rank <= 3
          const borderColor = row.color.startsWith('#') ? row.color : `#${row.color}`

          return (
            <div
              key={row.team_id}
              className="flex items-center gap-4 rounded-lg border border-brand-accent bg-brand-mid px-4 py-3 pl-3"
              style={{ borderLeftColor: borderColor, borderLeftWidth: '4px' }}
            >
              {/* Rank */}
              <div className="w-10 shrink-0 text-center">
                {isTopThree ? (
                  <span className="text-xl leading-none">{formatRank(row.rank)}</span>
                ) : (
                  <span className="font-mono text-sm text-gray-400">{formatRank(row.rank)}</span>
                )}
              </div>

              {/* Team info */}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-white">{row.team_name}</p>
                <p className="text-xs text-gray-400">{row.member_count} members</p>
              </div>

              {/* Score */}
              <div className="shrink-0 text-right">
                <p className="font-mono text-lg font-bold text-brand-orange">
                  {formatScore(row.total_pts)}
                </p>
                <p className="text-xs text-gray-500">pts</p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-6 rounded-lg border border-brand-accent bg-brand-mid">
        <TeamTrendsChart />
      </div>
    </div>
  )
}
