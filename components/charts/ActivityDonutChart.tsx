'use client'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { ACTIVITY_COLORS } from '@/lib/utils'

interface ActivityDonutChartProps {
  data: { type: string; minutes: number }[]
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number }[] }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm">
      <p className="font-semibold">{payload[0].name}: <span className="font-mono">{payload[0].value} min</span></p>
    </div>
  )
}

export function ActivityDonutChart({ data }: ActivityDonutChartProps) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-[200px] text-gray-500 text-sm">
        No activity data yet
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          dataKey="minutes"
          nameKey="type"
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={80}
          paddingAngle={2}
        >
          {data.map((entry) => (
            <Cell
              key={entry.type}
              fill={ACTIVITY_COLORS[entry.type] ?? ACTIVITY_COLORS.Other}
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  )
}
