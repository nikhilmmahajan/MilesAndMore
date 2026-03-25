'use client'

import { formatDate } from '@/lib/utils'
import type { StreakSubmission } from '@/lib/types'

interface StreakCalendarProps {
  submissions: StreakSubmission[]
}

export function StreakCalendar({ submissions }: StreakCalendarProps) {
  const sorted = [...submissions].sort((a, b) =>
    a.week_start_date.localeCompare(b.week_start_date)
  )

  return (
    <div className="flex flex-wrap gap-2">
      {sorted.map((sub) => {
        let tileClass = ''
        let symbol = ''
        let statusLabel = ''

        if (sub.completed) {
          tileClass = 'bg-green-700 border border-green-500 text-white'
          symbol = '✓'
          statusLabel = 'Completed'
        } else if (sub.bench_mode) {
          tileClass = 'bg-yellow-700/60 border border-yellow-500 text-yellow-200'
          symbol = '🪑'
          statusLabel = 'Bench'
        } else {
          tileClass = 'bg-gray-800 border border-gray-600 text-gray-400'
          symbol = '✗'
          statusLabel = 'Missed'
        }

        const tooltip = `Week of ${formatDate(sub.week_start_date)}: ${statusLabel}, ${sub.points_awarded} pts`

        return (
          <div
            key={sub.id}
            title={tooltip}
            className={`rounded-lg w-10 h-10 flex items-center justify-center text-xs font-bold cursor-default ${tileClass}`}
          >
            {symbol}
          </div>
        )
      })}
    </div>
  )
}
