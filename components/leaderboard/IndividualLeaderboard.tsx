'use client'

import { useState } from 'react'
import { LeaderboardRow } from '@/components/leaderboard/LeaderboardRow'
import { cn, timeAgo } from '@/lib/utils'
import type { LeaderboardRow as LeaderboardRowType } from '@/lib/types'

type GenderFilter = 'all' | 'M' | 'F'

interface IndividualLeaderboardProps {
  initialRows: LeaderboardRowType[]
  currentUserId: string
}

export function IndividualLeaderboard({ initialRows, currentUserId }: IndividualLeaderboardProps) {
  const [gender, setGender] = useState<GenderFilter>('all')

  const filtered =
    gender === 'all' ? initialRows : initialRows.filter((r) => r.gender === gender)

  const pills: { label: string; value: GenderFilter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Male', value: 'M' },
    { label: 'Female', value: 'F' },
  ]

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Individual Leaderboard</h2>
        <div className="flex items-center gap-2">
          {pills.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setGender(value)}
              className={cn(
                'text-sm transition-colors',
                gender === value
                  ? 'rounded-full bg-brand-orange px-3 py-1 text-white'
                  : 'rounded-full border border-brand-accent px-3 py-1 text-gray-400 hover:text-white'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Rows */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-500">
          <span className="text-3xl">🏁</span>
          <p className="mt-2 text-sm">Season hasn&apos;t started yet.</p>
        </div>
      ) : (
        <div>
          {filtered.map((row, idx) => (
            <LeaderboardRow
              key={row.user_id}
              row={row}
              isCurrentUser={row.user_id === currentUserId}
              rank={idx + 1}
            />
          ))}
        </div>
      )}

      {/* Last updated */}
      {initialRows[0]?.last_calculated && (
        <p className="mt-4 text-center text-xs text-gray-500">
          Last updated: {timeAgo(initialRows[0].last_calculated)}
        </p>
      )}
    </div>
  )
}
